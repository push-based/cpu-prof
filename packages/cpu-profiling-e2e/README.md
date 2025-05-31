# cpu-profiling-e2e

This library was generated with [Nx](https://nx.dev).

## Running e2e tests

Run `nx e2e-test cpu-profiling-e2e` to execute the unit tests via [Vitest](https://vitest.dev/).

Manually test examples:

# Merge

- `node packages/cpu-profiling/dist/cpu-prof.esm.js --help`
- `node packages/cpu-profiling/dist/cpu-prof.esm.js cpu-merge -- ./packages/cpu-profiling-e2e/mocks/ng-serve-cpu`
- `node packages/cpu-profiling/dist/cpu-prof.esm.js cpu-merge -- ./packages/cpu-profiling-e2e/mocks/ng-build-cpu`

# Measure

- `node packages/cpu-profiling/dist/cpu-prof.esm.js cpu-measure -v -- -e "console.log(1)"`
- `node packages/cpu-profiling/dist/cpu-prof.esm.js cpu-measure -v -- -e "console.log(1)"`
- `node packages/cpu-profiling/dist/cpu-prof.esm.js cpu-measure -v -- -e "console.log(1)"`
