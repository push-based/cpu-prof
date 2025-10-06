# Case Study — Nx graph time

## Measured graphs

Use native Node.js CPU profiling to analyze where time is spent when calculating Nx graphs.

### Project Graph

Save setup specification:

```bash
nx report > ./profiles/nx-show-projects/nx-report.md
```

Measure the project graph creation:

```bash
# Prerequisite (once): install local deps so ./node_modules/.bin/nx exists
NX_DAEMON=false NX_CACHE=false \
npx -y @push-based/cpu-prof \
--cpu-prof-dir ./profiles/nx-show-projects \
node ./node_modules/nx/bin/nx.js show projects --json
```

### Task Graph

Save setup specification:

```bash
nx report > ./profiles/nx-show-project/nx-report.md
```

Measure the task graph creation:

```bash
# Prerequisite (once): install local deps so ./node_modules/.bin/nx exists
NX_DAEMON=false NX_CACHE=false \
npx -y @push-based/cpu-prof \
--cpu-prof-dir ./profiles/nx-show-project \
node ./node_modules/nx/bin/nx.js show project <project-name> --json
```

| 
