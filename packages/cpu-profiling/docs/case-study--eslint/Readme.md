# Case Study - ESLint

## Problem

Running ESLint on with Nx is dramatically slower than running it without Nx.

## Executing ESLint Directly

1. Run eslint directly with CPU profiling enabled through `NODE_OPTIONS`

`/Users/michael_hladky/WebstormProjects/nx-advanced-perf-logging/profiles/nx`

TIMING=1 eslint --config eslint.config.mjs packages/cpu-profiling --output-file=/Users/michael_hladky/WebstormProjects/nx-advanced-perf-logging/profiles/eslint/lint-stats.json --format=json --stats

```shell
# - `NODE_OPTIONS` is used to set the Node.js options acros processes and threads. using `--cpu-prof`, basically any argumebt is not guarantied to be passed to child processes/threads.
#   - `--cpu-prof` is used to enable the CPU profiling.
#   - `--cpu-prof-dir` is the directory to save the CPU profile. We set it to a absolute path tto ensure that any created process or thread will create it's `.cpuprofile` file in the same directory.  If we don't do this, the `.cpuprofile` will be created eaches process current working directory wich can vary.
# - `node ./node_modules/.bin/eslint` is the command to execute the ESLint CLI.
#   - `--config eslint.config.mjs` is the path to the ESLint configuration file.
#   - `packages/cpu-profiling` is the path to the directory containing the files to lint.
NODE_OPTIONS="--cpu-prof --cpu-prof-dir=/<absolute-path-to-repo>/profiles/eslint" node ./node_modules/.bin/eslint --config eslint.config.mjs packages/cpu-profiling
```

This will create a `.cpuprofile` file in the folder `profiles/eslint`.

**Files:**

- [`eslint-cpu-profile.cpuprofile`](./eslint-cpu-profile.cpuprofile)

2. Open Chrome DevTools and navigate to the "Performance" tab.
3. Drag and drop the `.cpuprofile` file locate in folder `profiles/eslint` into the "Performance" tab.

### Adding timing arguments to the command

```shell
NODE_OPTIONS="--cpu-prof --cpu-prof-dir=/<Users>/<user-name>/<workspace>/profiles/eslint" node ./node_modules/.bin/eslint --config eslint.config.mjs packages/cpu-profiling
TIMING=1 eslint --config eslint.config.mjs packages/cpu-profiling --output-file=/<Users>/<user-name>/<workspace>/profiles/eslint/lint-stats.json --format=json --stats
```

| Rule                                 | Time (ms) | Relative |
| :----------------------------------- | --------: | -------: |
| @typescript-eslint/no-unused-vars    |    40.036 |    46.5% |
| @nx/enforce-module-boundaries        |    10.716 |    12.4% |
| no-control-regex                     |     2.428 |     2.8% |
| @typescript-eslint/no-empty-function |     2.423 |     2.8% |
| no-useless-escape                    |     2.335 |     2.7% |
| no-misleading-character-class        |     1.818 |     2.1% |
| no-regex-spaces                      |     1.524 |     1.8% |
| no-extra-boolean-cast                |     1.440 |     1.7% |
| no-unused-private-class-members      |     1.261 |     1.5% |
| @typescript-eslint/ban-ts-comment    |     1.257 |     1.5% |

| Rule                                 | Time (ms) | Relative |
| :----------------------------------- | --------: | -------: |
| @nx/enforce-module-boundaries        |   158.420 |    62.8% |
| @typescript-eslint/no-unused-vars    |    39.058 |    15.5% |
| no-misleading-character-class        |     5.997 |     2.4% |
| no-useless-escape                    |     4.056 |     1.6% |
| no-control-regex                     |     3.578 |     1.4% |
| @typescript-eslint/no-empty-function |     3.359 |     1.3% |
| no-fallthrough                       |     2.642 |     1.0% |
| no-useless-backreference             |     2.451 |     1.0% |
| no-var                               |     2.080 |     0.8% |
| prefer-spread                        |     1.983 |     0.8% |

## Executing ESLint with NX

1. Run eslint with NX with CPU profiling enabled through `NODE_OPTIONS`

```shell
NODE_OPTIONS="--cpu-prof --cpu-prof-dir=/<Users>/<user-name>/<workspace>/profiles/nx-eslint" nx lint cpu-profiling
```

This will create 2 different `.cpuprofile` file in the folder `profiles/nx-eslint`.
One for the `nx` command and one for the `eslint` command. The reason for this is that the `eslint` command is executed by the `nx` in a different precces by using `spawn` and or `Worker` class.

**Files:**

- [`eslint-cpu-profile-nx.cpuprofile`](./nx.cpuprofile)
- [`eslint-cpu-profile-eslint.cpuprofile`](./nx-eslint-lint.cpuprofile)

2. Open Chrome DevTools and navigate to the "Performance" tab.
3. Drag and drop the `.cpuprofile` file locate in folder `profiles/nx-eslint` into the "Performance" tab one at a time.

### Adding timing arguments to the command

```shell
TIMING=1 nx run cpu-profiling:lint --output-file=profiles/all/lint-stats.json --format=json --stats

TIMING=1 nx run cpu-profiling:lint --output-file=/Users/michael_hladky/WebstormProjects/nx-advanced-perf-logging/profiles/eslint/lint-stats.json --format=json --stats

```

| Rule                                 | Time (ms) | Relative |
| :----------------------------------- | --------: | -------: |
| @nx/dependency-checks                |    42.028 |    33.3% |
| @typescript-eslint/no-unused-vars    |    40.930 |    32.5% |
| @nx/enforce-module-boundaries        |    10.589 |     8.4% |
| no-control-regex                     |     2.211 |     1.8% |
| @typescript-eslint/no-empty-function |     2.176 |     1.7% |
| no-useless-escape                    |     1.953 |     1.5% |
| no-misleading-character-class        |     1.757 |     1.4% |
| no-regex-spaces                      |     1.380 |     1.1% |
| @typescript-eslint/ban-ts-comment    |     1.207 |     1.0% |
| no-loss-of-precision                 |     1.201 |     1.0% |

### Thoughts

- big JSNO files are in the codebase
- selint-parser long CPU
- nx rule biggest time %
- nx rule in addition to other rules
-
