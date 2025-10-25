# Perf Audit Base — Nx graph time

## Tools and Setup

### Setup Detection

We use commands to capture the setup specification:
- `nx report` - to capture the Nx, Node.js, and OS versions.
- `nx reset` - to reset the Nx daemon and clear the cache before running measurements.

### Environment

We disable the Nx daemon and the Nx cache to ensure consistent measurements:

- `NX_DAEMON=false` - Disables the Nx daemon, which can cache results and affect performance measurements.
- `NX_CACHE=false` - Disables the Nx computation cache, ensuring that all computations are performed fresh without cached results.
- `NX_TUI=false` - Disables the Nx TUI (Text User Interface) to avoid any potential interference with performance measurements.

### CPU Profiling

We use the native Node.js CPU profiling capabilities through the `--cpu-prof` and `--cpu-prof-dir` flags.  
The tool [@push-based/cpu-prof](https://www.npmjs.com/package/@push-based/cpu-prof) 🚀 provides a convenient CLI to run commands with CPU profiling enabled and to merge multiple CPU profiles into one.

## Measurements

Use native Node.js CPU profiling to analyze where time is spent when calculating Nx graphs.

The following commands are executed from the root of a Nx workspace:
- Project graph generation
- Project graph without plugins
- Task graph for specific target

### Project Graph (nx graph)

1. Save setup specification:

```bash
mkdir -p ./profiles/nx-project-graph && \
nx reset && nx report > ./profiles/nx-project-graph/nx-report.md
```

2. Measure the project graph creation:

```bash
NX_DAEMON=false NX_CACHE=false \
npx -y @push-based/cpu-prof \
--cpu-prof-dir ./profiles/nx-project-graph \
node ./node_modules/nx/bin/nx.js graph --file=./profiles/nx-project-graph/nx-project-graph.json
```

### Project Graph (no plugins)

1. Remove plugins from nx.json

```bash
node -e "const f='nx.json',fs=require('fs');fs.copyFileSync(f,f+'.bak');const j=JSON.parse(fs.readFileSync(f,'utf8'));delete j.plugins;fs.writeFileSync(f,JSON.stringify(j, null, 2))"
```

2. Save setup specification:

```bash
mkdir -p ./profiles/nx-project-graph-no-plugins && \
nx reset && nx report > ./profiles/nx-project-graph-no-plugins/nx-report.md
```

3. Measure the project graph creation without plugins:

```bash
# Prerequisite (once): install local deps so ./node_modules/.bin/nx exists
# Before running, remove plugins from nx.json
NX_DAEMON=false NX_CACHE=false \
npx -y @push-based/cpu-prof \
--cpu-prof-dir ./profiles/nx-project-graph-no-plugins \
node ./node_modules/nx/bin/nx.js graph --file=./profiles/nx-project-graph-no-plugins/nx-project-graph-no-plugins.json
```
4. Restore nx.json

```bash
node -e "require('fs').copyFileSync('nx.json.bak','nx.json')"
```

### Task Graph for specific target(s)

1. Save setup specification:

```bash
mkdir -p ./profiles/nx-task-graph-build && \
nx reset && nx report > ./profiles/nx-task-graph-build/nx-report.md
```

2. Measure the task graph creation for specific target(s):

```bash
# Prerequisite (once): install local deps so ./node_modules/.bin/nx exists
NX_DAEMON=false NX_CACHE=false \
npx -y @push-based/cpu-prof \
--cpu-prof-dir ./profiles/nx-task-graph-build \
node ./node_modules/nx/bin/nx.js graph --view=tasks --targets=<targets> --file=./profiles/nx-task-graph-build/nx-task-graph-build.json
```




