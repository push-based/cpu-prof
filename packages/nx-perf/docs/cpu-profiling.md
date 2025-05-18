# Node CPU Profiling

## 🧠 What is CPU Profiling?

CPU profiling is a technique used to analyze the performance of a program by collecting data about its CPU usage. It
helps identify which parts of the code consume the most CPU resources, allowing developers to optimize performance.

## Create a CPU Profile

To create a CPU profile, you can use the `--cpu-prof` flag when running your Node.js application. This will generate a
`.cpuprofile` file containing the profiling data.

> **Official docs:**: [Node.js CPU Profiling](https://nodejs.org/api/inspector.html#inspector_cpu_profiling)

```shell
node --cpu-prof index.js
```

This command will create a file named `CPU.<timestamp>.<pid>.<tid>.<sequence>.cpuprofile` in the current working
directory.

### CPU Profile Filename

```shell
┌────────────────────────────────────────────────────────────┐
│  CPU.20250510.134625.51430.0.001.cpuprofile                │
│      │        │      │     │   │                           │
│      │        │      │     │   └────── %N = Sequence (001) ┘
│      │        │      │     └────────── %T = Thread ID (0)
│      │        │      └──────────────── %P = Process ID (51430)
│      │        └─────────────────────── %H = Time (134625 → 13:46:25)
│      └──────────────────────────────── %D = Start Date (20250510 → May 10, 2025)
└─────────────────────────────────────── Fixed prefix = "CPU"
```

The date and time are from when the profiling was started, not the moment it was written to disk, which is after the
profiling finished.

🧠 What Creates New `PID` and `TID` in `.cpuprofile` Files?

**`%P` → Process ID (PID)**

- 🧬 Comes from the **OS-level process ID**
- A new PID is created whenever you start a **new process**, such as:
    - `child_process.fork()`
    - `child_process.spawn()`
    - `child_process.exec()`
    - Running `node` directly (CLI, script)

**`%T` → Thread ID (TID)**

- 🧠 Comes from **V8's internal thread registry**
- Most Node.js apps are single-threaded → TID = `0` or `1`
- A new TID is created **only when you spawn a `Worker`**:
    - `new Worker()` from `node:worker_threads`
    - Each worker gets a new `threadId` from the runtime

**Example:**

`node --cpu-prof create-3-worker-children.mjs`

- CPU.20250510.135416.51623.0.001.cpuprofile
- CPU.20250510.135416.51623.1.002.cpuprofile
- CPU.20250510.135416.51623.2.003.cpuprofile

`node --cpu-prof spawn-3-process-children.mjs 3`

- CPU.20250510.135416.51623.0.001.cpuprofile
- CPU.20250510.135416.51624.0.001.cpuprofile
- CPU.20250510.135416.51625.0.001.cpuprofile

---

Summary

| Mechanism              | PID 🔢       | TID 🔢       | Notes                                |
|------------------------|--------------|--------------|--------------------------------------|
| `node app.js`          | ➖ (same)     | ➖ (main = 0) | Single process, single main thread   |
| `child_process.fork()` | 🔼 (new)     | ➖ (main = 0) | New OS process, same threading model |
| `new Worker()`         | ➖ (same PID) | 🔼 (new)     | New thread within same process       |

---

## Data Structure

```ts
/**
 * Represents a single call frame in the CPU profile.
 * Each call frame contains information about the function being executed,
 * the script it belongs to, and its location in the script.
 */
type CallFrame = {
    // Name of the function e.g. "child-work-1"
    functionName: string;
    // unique identifier for the script e.g. 0
    scriptId: string;
    // URL of the script e.g. "file:///index.mjs"
    url: string;
    // Line number in the script e.g. 10
    lineNumber: number;
    // Column number in the script e.g. 2
    columnNumber: number;
};

/**
 * Represents a node in the CPU profile.
 * Each node corresponds to a function call and contains information about
 * the call frame, its children, and an optional hit count.
 */
type Node = {
    // Unique identifier for the node e.g. 1
    id: number;
    // Call frame information for the node
    callFrame: CallFrame;
    // List of child node IDs called by this node. e.g. [2,3]
    children: number[];
    // Optional hit count for the node, indicating how many times it was executed
    hitCount?: number;
};

type CpuProfile = {
    // List of nodes in the CPU profile
    nodes: Node[];
    // Start time of the profile in microseconds (μs)
    startTime: number;
    // End time of the profile in microseconds (μs)
    endTime: number;
    // List of node IDs indicating which nodes were active during the profile. e.g. [2,4,5]
    samples: number[];
    // List of time deltas between samples in microseconds (μs)
    timeDeltas: number[];
};
```

## Example for a Minimal CPU Profile

_CPU.20250510.135416.51623.0.001.cpuprofile_

```json
{
  "nodes": [
    {
      "id": 0,
      "callFrame": {
        "functionName": "(root)",
        "scriptId": "0",
        "url": "",
        "lineNumber": -1,
        "columnNumber": -1
      },
      "children": [
        2
      ]
    },
    {
      "id": 1,
      "callFrame": {
        "functionName": "runMainESM",
        "scriptId": "1",
        "url": "node:internal/modules/run_main",
        "lineNumber": 92,
        "columnNumber": 19
      },
      "children": [
        3
      ],
      "hitCount": 1
    },
    {
      "id": 2,
      "callFrame": {
        "functionName": "main-work",
        "scriptId": "2",
        "url": "file:///index.mjs",
        "lineNumber": 10,
        "columnNumber": 0
      },
      "children": [
        4,
        5
      ],
      "hitCount": 1
    },
    {
      "id": 3,
      "callFrame": {
        "functionName": "child-work-1",
        "scriptId": "2",
        "url": "file:///index.mjs",
        "lineNumber": 11,
        "columnNumber": 2
      },
      "hitCount": 1
    },
    {
      "id": 4,
      "callFrame": {
        "functionName": "child-work-1",
        "scriptId": "2",
        "url": "file:///index.mjs",
        "lineNumber": 12,
        "columnNumber": 2
      },
      "hitCount": 1
    }
  ],
  "startTime": 100000000000,
  "endTime": 100000000400,
  "samples": [
    1,
    3,
    4
  ],
  "timeDeltas": [
    100,
    100,
    100
  ]
}
```

### Synthetic and Internal Frames

The `functionName` in parentheses are **synthetic frames** that V8 inserts to represent things like “entry point”,
“top-level script evaluation”, “no JS running (idle)”, and GC cycles.

The `scriptId` of syntectic frames is always `0`, the `url` is empty `"` and `lineNumber` and `columnNumber` is `-1`.

```json
{
  "id": 1,
  "callFrame": {
    "functionName": "(root)",
    "scriptId": "0",
    "url": "",
    "lineNumber": -1,
    "columnNumber": -1
  },
  "children": []
}
```

| Function                | Explanation                                                                                                             |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------|
| Synthetic               | ---                                                                                                                     |
| **(root)**              | The synthetic root of the call tree. All other frames are descendants of this “function.”                               |
| **(program)**           | The top‐level entry point of your script. Covers the module’s initial evaluation before any functions are invoked.      |
| **openFileHandle**      | The underlying V8/Node function that opens a file descriptor. Called by high-level APIs like `fs.open`.                 |
| **(garbage collector)** | A special marker whenever V8’s GC runs. No JavaScript code—just time spent reclaiming memory.                           |
| **(idle)**              | Indicates the event loop is idle—nothing JavaScript-related is executing, and the process is waiting for I/O or timers. |
| **lstat**               | The V8 binding for the `fs.lstat` syscall, used internally when you or a library check file or symlink metadata.        |
| Internal                | ---                                                                                                                     |
| **compileFunction**     | V8’s internal routine that parses and compiles a JS function’s source to bytecode.                                      |
| **link**                | V8’s step of resolving closures and setting up function scopes (“linking” compiled code into the runtime).              |
| **evaluate**            | The execution of top-level script code or VM-compiled code; e.g. running your module’s body.                            |
| **consoleCall**         | The built-in handler for `console.log` and other console methods—formats and writes to stdout/stderr.                   |
| **Worker**              | The entry for spinning up a `Worker` thread (Node’s `worker_threads`), including setup and messaging plumbing.          |
| **startThread**         | Platform-level call to begin a new OS thread for a Worker, wrapping the native thread creation.                         |
| **postMessage**         | The V8/Node routine that serializes and posts data from the main thread to a Worker (or vice versa).                    |
| **writeUtf8String**     | The internal I/O function that writes a UTF-8 string (e.g. your log output) into a buffer or file descriptor.           |

### Example - CPU Profile including synthetic nodes

```json
{
  "nodes": [
    {
      "id": 1,
      "callFrame": {
        "functionName": "(root)",
        "scriptId": "0",
        "url": "",
        "lineNumber": -1,
        "columnNumber": -1
      },
      "children": [
        2,
        4,
        3
      ]
    },
    {
      "id": 2,
      "callFrame": {
        "functionName": "(program)",
        "scriptId": "0",
        "url": "",
        "lineNumber": -1,
        "columnNumber": -1
      },
      "hitCount": 1
    },
    {
      "id": 3,
      "callFrame": {
        "functionName": "(idle)",
        "scriptId": "0",
        "url": "",
        "lineNumber": -1,
        "columnNumber": -1
      }
    },
    {
      "id": 4,
      "callFrame": {
        "functionName": "runMainESM",
        "scriptId": "1",
        "url": "node:internal/modules/run_main",
        "lineNumber": 92,
        "columnNumber": 19
      },
      "children": [
        5
      ],
      "hitCount": 1
    },
    {
      "id": 5,
      "callFrame": {
        "functionName": "main-work",
        "scriptId": "2",
        "url": "file:///index.mjs",
        "lineNumber": 10,
        "columnNumber": 0
      },
      "children": [
        6,
        7
      ],
      "hitCount": 1
    },
    {
      "id": 6,
      "callFrame": {
        "functionName": "child-work-1",
        "scriptId": "2",
        "url": "file:///index.mjs",
        "lineNumber": 14,
        "columnNumber": 2
      },
      "hitCount": 1
    },
    {
      "id": 7,
      "callFrame": {
        "functionName": "child-work-2",
        "scriptId": "2",
        "url": "file:///index.mjs",
        "lineNumber": 18,
        "columnNumber": 2
      },
      "hitCount": 1
    }
  ],
  "startTime": 100000000000,
  "endTime": 100000000600,
  "samples": [
    2,
    4,
    5,
    6,
    7,
    3
  ],
  "timeDeltas": [
    0,
    100,
    100,
    100,
    100,
    100
  ]
}
```

### CPU Profiling arguments

| Flag                  | Added in      | Default                                                     | Description                                                                              |
|-----------------------|---------------|-------------------------------------------------------------|------------------------------------------------------------------------------------------|
| `--cpu-prof`          | v12.0.0 (Exp) | off                                                         | Starts the V8 CPU profiler on startup and writes a `.cpuprofile` on exit. ([Node.js][1]) |
| `--cpu-prof-dir`      | v12.0.0 (Exp) | current working directory (via `--diagnostic-dir`)          | Directory where `--cpu-prof` outputs are written. ([Node.js][1])                         |
| `--cpu-prof-name`     | v12.0.0 (Exp) | `CPU.${yyyymmdd}.${hhmmss}.${pid}.${tid}.${seq}.cpuprofile` | Filename to use for the CPU profile. ([Node.js][1])                                      |
| `--cpu-prof-interval` | v12.2.0 (Exp) | `1000` μs                                                   | Sampling interval in microseconds for the CPU profiler. ([Node.js][2])                   |

[1]: https://nodejs.org/api/cli.html?utm_source=chatgpt.com "Command-line API | Node.js v24.0.2 Documentation"

[2]: https://nodejs.org/download/rc/v13.10.1-rc.0/docs/api/cli.html?utm_source=chatgpt.com "Command Line Options | Node.js v13.10.1-rc.0 Documentation"

Example:

```shell
node --cpu-prof --cpu-prof-interval=50 --cpu-prof-dir=./profiles --cpu-prof-name="my-profile.cpuprofile" index.js
```

### CPU Profiling with `--cpu-prof-interval`

The `--cpu-prof-interval` flag allows you to specify the sampling interval for CPU profiling. This can help you control
the granularity of the profiling data and the size of the generated `.cpuprofile` file.

Be aware that a smaller sampling interval will result in a larger `.cpuprofile` file, as more samples will be collected.

| Profile File             | Sampling Interval | Duration | Total Nodes | Total Samples | Avg Sample Interval | File Size |
|--------------------------|-------------------|----------|-------------|---------------|---------------------|-----------|
| `empty-1.cpuprofile`     | 1 µs              | 58.5 ms  | 472         | 10,514        | 0.0 ms              | 162.0 KB  |
| `empty-10.cpuprofile`    | 10 µs             | 17.5 ms  | 338         | 931           | 0.0 ms              | 73.3 KB   |
| `empty-100.cpuprofile`   | 100 µs            | 15.0 ms  | 153         | 100           | 0.1 ms              | 28.9 KB   |
| `empty-1000.cpuprofile`  | 1000 µs (1 ms)    | 13.9 ms  | 49          | 10            | 1.3 ms              | 8.6 KB    |
| `empty-10000.cpuprofile` | 10000 µs (10 ms)  | 14.0 ms  | 3           | 2             | 6.9 ms              | 0.5 KB    |

```shell
node --cpu-prof --cpu-prof-interval=100 --cpu-prof-dir=tmp-prof-intervals --cpu-prof-name="empty-100.cpuprofile" packages/nx-perf/mocks/minimal-child-process.mjs
node -e "const p=JSON.parse(require('fs').readFileSync('empty-100.cpuprofile').size/1024).toFixed(1) + 'KB');"
```

---

`NX_DAEMON=false NX_CLOUD=false node --cpu-prof --cpu-prof-interval=20 --cpu-prof-dir=./profiles
node_modules/nx/bin/nx.js`
