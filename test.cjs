// log-script0-functions.js
const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.error(`Usage: node ${path.basename(process.argv[1])} tmp/nx-perf/merge/setup-empty-profile/CPU.20250516.014800.59522.0.003.json`);
    process.exit(1);
}

const filePath = process.argv[2];

// Read and parse the JSON file
let data;
try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch (err) {
    console.error(`Error reading or parsing "${filePath}":`, err.message);
    process.exit(1);
}

// Ensure we have a nodes array
if (!Array.isArray(data.nodes)) {
    console.error(`Invalid profile format: "nodes" array not found.`);
    process.exit(1);
}

// Filter and log
const names = data.nodes
    .filter(node => node.callFrame && node.callFrame.scriptId === "0")
    .map(node => node.callFrame.functionName);

// Dedupe and print
[...new Set(names)].forEach(name => {
    console.log(name);
});
