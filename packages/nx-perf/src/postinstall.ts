import { writeFileSync, readFileSync } from 'node:fs';

// This is adding `require("./../../../tools/shim");` to your `node_modules/nx/src/utils/perf-logging.js`.
writeFileSync(
  './node_modules/nx/src/utils/perf-logging.js',
  readFileSync(
    './node_modules/nx/src/utils/perf-logging.js',
    'utf-8'
  ).toString() +
    'require("./../../../node_modules/@puah-based/nx-perf/src/shim.js");'
);
