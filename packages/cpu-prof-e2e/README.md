# cpu-prof-e2e

This library was generated with [Nx](https://nx.dev).

## Running e2e tests

Run `nx e2e-test cpu-prof-e2e` to execute the unit tests via [Vitest](https://vitest.dev/).

Manually test examples:

## General
- `cpu-prof --help`

# Measure

- `cpu-prof measure --help` - print help
- `cpu-prof measure "node -e 'console.log(42)'"` - profile node evel execution
- `cpu-prof measure node ./script.js` - profile node script
- `cpu-prof measure npm -v` - profile npm version check
- `cpu-prof measure npx eslint --print-config ./eslint.config.mjs` - profile eslint getConfig
- `cpu-prof measure npx eslint ./eslint.config.mjs` - profile eslint getConfig + linting
- `cpu-prof measure nx show projects` - profile Nx ProjsetGraph
- `cpu-prof measure nx show project cpu-prof --json` - profile Nx TaskGraph

# Merge

- `cpu-prof merge --help` - print help
- `cpu-prof merge ./profiles` - merge cpuprofiles in ./profiles
