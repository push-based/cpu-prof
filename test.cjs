const traceviewify = require('traceviewify');
const cpuprofile = require('./packages/nx-perf/mocks/fixtures/minimal.cpuprofile');
const {writeFile} = require("node:fs/promises");
const traceviewObjectFormat = traceviewify(cpuprofile);

writeFile(
    "./minimal.traceview.json",
    JSON.stringify(traceviewObjectFormat, null, 2)
).then(() => {
    console.log("Traceview file written successfully");
}).catch((err) => {
    console.error("Error writing traceview file", err);
});
