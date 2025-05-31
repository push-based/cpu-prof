# cpu-prof-e2e

This library was generated with [Nx](https://nx.dev).

## Running e2e tests

Run `nx e2e-test cpu-prof-e2e` to execute the unit tests via [Vitest](https://vitest.dev/).

Manually test examples:

# Merge

- `node packages/cpu-prof/dist/cpu-prof.esm.js --help`
- `node packages/cpu-prof/dist/cpu-prof.esm.js cpu-merge -- ./packages/cpu-prof-e2e/mocks/ng-serve-cpu`
- `node packages/cpu-prof/dist/cpu-prof.esm.js cpu-merge -- ./packages/cpu-prof-e2e/mocks/ng-build-cpu`

# Measure

## Measure a .js script

`node packages/cpu-prof/dist/cpu-prof.esm.js cpu-measure -v -- /Users/michael_hladky/WebstormProjects/nx-advanced-perf-logging/packages/cpu-prof-e2e/mocks/single.process.js`

- `node packages/cpu-prof/dist/cpu-prof.esm.js cpu-measure -v -- -e "console.log(1)"`
- `node packages/cpu-prof/dist/cpu-prof.esm.js cpu-measure -v -- -e "console.log(1)"`
- `node packages/cpu-prof/dist/cpu-prof.esm.js cpu-measure -v -- -e "console.log(1)"`
