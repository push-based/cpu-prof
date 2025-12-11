### Nx task execution: what processes get spawned and when

This document explains, end-to-end, which processes Nx starts when you run a task (e.g., `build`, `test`, `lint`), how those processes relate to each other, and how this differs with caching, watch/continuous tasks, CI, and distributed execution.

The goal is to help you reason about CPU usage, process trees, and where time is spent.

---

## High-level architecture

- **Nx CLI process**: The `nx` command you run in your terminal. It parses flags, prepares context, and orchestrates execution.
- **Nx Daemon (background process)**: A long-lived background service that maintains the project graph, file hashing, and other metadata to make repeated commands fast. It is started on demand and reused across commands.
- **Task Runner (inside the CLI process)**: Plans and schedules tasks, checks the cache, and spawns per-task processes when needed.
- **Executor process (per task)**: A short-lived Node.js process that runs the task’s executor implementation for a project and target (e.g., `@nx/jest:jest`, `@nx/js:tsc`, `@nx/webpack:webpack`). Executors typically invoke underlying tools.
- **Tool subprocesses (optional, per executor)**: Many executors delegate to external CLIs (e.g., `jest`, `tsc`, `webpack`). Those tools often run in their own processes spawned by the executor.

In distributed runs, some or all executor work may be offloaded to Nx Agents on other machines. Locally, you still have the CLI and (optionally) the Daemon.

---

## Typical process trees

### Cache miss (work has to run)

```text
Terminal shell
└─ node .../nx/bin/nx.js <command>
   ├─ (connect to Nx Daemon or start it if not running)
   ├─ plan tasks, check cache
   └─ spawn per-task executor(s):
      ├─ node <executor entry> (projectA:build)
      │  └─ tsc / webpack / esbuild / etc. (spawned by the executor)
      └─ node <executor entry> (projectB:test)
         └─ jest (spawned by the executor)
```

Notes:

- The CLI multiplexes logs from all running executors and prefixes output with the task id (e.g., `proj:test`).
- Degree of parallelism is controlled via flags like `--parallel` (and task runner config).

### Cache hit (no work needs to run)

```text
Terminal shell
└─ node .../nx/bin/nx.js <command>
   ├─ (connect to Nx Daemon or start it if not running)
   ├─ compute hashes and find cache entries
   ├─ restore outputs to disk
   └─ replay captured terminal output (no executor processes spawned)
```

When results are fully cached, Nx does not spawn executor or tool processes. It restores artifacts and terminal output.

### Watch/continuous tasks (long‑lived)

```text
Terminal shell
└─ node .../nx/bin/nx.js dev / serve / test --watch
   ├─ (optional) Nx Daemon for file graph and hashing
   └─ node <executor entry> (long-lived)
      └─ underlying tool in watch/server mode (long-lived)
```

The CLI keeps streaming output from long-lived tasks until you stop them. Multiple continuous tasks can be multiplexed.

### Distributed Task Execution (Nx Agents)

Locally you see the CLI (and optionally the Daemon). Tasks that are offloaded to agents execute on remote machines; their logs stream back to your terminal. Locally, no per-task executor processes are spawned for offloaded tasks.

---

## Lifecycle in detail

1. **CLI startup**

- Parses the command (e.g., `nx build app`), loads `nx.json`/plugins, and resolves the workspace root.

2. **Connect to Nx Daemon**

- The CLI attempts to connect to the Daemon. If the Daemon is disabled or unavailable, the CLI operates without it, doing the work inline.
- With the Daemon, project graph and file hash metadata are served quickly from memory.

3. **Project graph and task graph**

- Nx determines which projects and targets are involved and builds a task graph respecting dependencies and pipelines.

4. **Hashing and cache lookup**

- Nx computes a hash for each task using inputs like source files, configuration, environment inputs, tool versions, and CLI flags.
- If there is a matching cache entry (local or remote), Nx restores outputs and terminal output without spawning executors.

5. **Scheduling and concurrency**

- Nx schedules tasks according to the task graph and the configured/max parallelism. Independent tasks run concurrently.

6. **Spawning executor processes**

- For each task that needs to run, Nx spawns a Node.js process to run the task’s executor implementation (from the relevant plugin). Executors receive `options` and `context` and report success/failure.

7. **Executor-to-tool subprocesses**

- Executors typically invoke the underlying tool (e.g., `jest`, `tsc`, `webpack`) using child processes. Those tool processes perform the heavy work.

8. **Output capture and log multiplexing**

- The CLI captures stdout/stderr from all task processes, prefixes lines with the task id, and renders progress.

9. **Cache write-back**

- On success, task outputs and terminal output are captured and stored in the cache for future reuse (local cache; and remote cache if configured).

10. **Shutdown / persistence**

- Executor and tool processes exit when done. The CLI process exits when all tasks complete. The Daemon (if used) remains running for future commands.

---

## The Nx Daemon

Responsibilities:

- Keep the project graph and file hashes warm in memory for fast subsequent runs.
- Provide file change information and incremental hash computation.

Behavior and control:

- Starts on demand the first time a command needs it and persists across commands.
- Can be disabled per-run or globally.
- In CI, it is common to disable the Daemon for simplicity and isolation.

Operations and maintenance:

- Stop and clear state: `npx nx reset` (stops the Daemon and clears the local Nx cache).
- Stop only (if needed): `npx nx daemon --stop`.

Environment and flags:

- `NX_DAEMON=false` disables the Daemon for a single command or environment.
- Some commands provide explicit flags to force using or not using the Daemon.

Cache location (local):

- By default, Nx stores cache artifacts under `node_modules/.cache/nx` in the workspace. This includes terminal output and task outputs.

---

## Caching controls

- **Skip cache for a run**: pass `--skip-nx-cache` on the command line or set `NX_SKIP_NX_CACHE=true`.
- **Remote caching** (optional): when configured (e.g., Nx Cloud), cache hits can be served from remote storage; misses are uploaded on success.

When results are fully cached, executor and tool processes are not spawned.

---

## Concurrency and parallelism

- Use `--parallel` (or task runner config) to run independent tasks concurrently.
- Nx ensures dependent tasks run in the correct order while maximizing parallel work.
- Each running task typically corresponds to one executor Node.js process, which may in turn spawn additional tool processes.

---

## Examples

### Example 1: `nx test web` (cache miss)

```text
node nx/bin/nx.js test web
├─ (daemon) nx-daemon (already running)
├─ plan + hash -> cache miss
└─ spawn executor: node @nx/jest:jest
   └─ spawn tool:  node node_modules/jest/bin/jest.js --runInBand
```

### Example 2: `nx build api` (cache hit)

```text
node nx/bin/nx.js build api
├─ (daemon) nx-daemon (already running)
├─ plan + hash -> cache hit
├─ restore dist/ outputs
└─ replay terminal output (no executor/tool processes)
```

### Example 3: Continuous tasks

```text
node nx/bin/nx.js dev frontend
└─ node @nx/webpack:webpack (long-lived)
   └─ webpack dev server (long-lived)
```

---

## CI guidance

- Prefer deterministic, isolated runs in CI. Common patterns:
  - Disable the Daemon: `NX_DAEMON=false`.
  - Enable remote caching for maximal reuse across jobs.
  - Use distributed execution (Nx Agents) to parallelize across machines when needed.

---

## Troubleshooting

- **Clear state**: `npx nx reset` to stop the Daemon and clear local cache.
- **Disable Daemon for a single command**: `NX_DAEMON=false npx nx <command>`.
- **Bypass cache**: `npx nx <command> --skip-nx-cache`.
- **Inspect what ran vs. cached**: use verbose logging flags to see which tasks were executed vs. restored from cache.

---

## Notes and scope

- Exact internal details (e.g., IPC method between CLI and Daemon) are considered internal and may change between Nx versions. The external behavior outlined here (what spawns, when, and how to control it) is stable and sufficient for performance and profiling work.

---

## Planned custom trace tracks (ASCII)

```text
Time (ms) →    0    10   20   30   40   50   60   70   80   90  100  110  120

Track: CLI          |============================= CLI =============================|

Track: Daemon                    |===== Daemon connect / warmup =====|

Track: Executor lib:build                    |========== lib:build =========|
Track:   Tool tsc                               |====== tsc ======|

Track: Executor app:test                    |============== app:test ==============|
Track:   Tool jest                                 |=========== jest ===========|

Track: Marker (complete)                                                             | RunTask |
```

Legend:

- CLI covers the full command lifetime.
- Daemon connect happens early and is short-lived (if already warm, it may be shorter).
- Executors run per task; tools (like `tsc`/`jest`) run inside their executor windows.
- The marker indicates the end of the trace capture window.
- Color scheme: Nx internals (CLI, Daemon) use `primary`.
- Color scheme: Executors and tools use `secondary`.
