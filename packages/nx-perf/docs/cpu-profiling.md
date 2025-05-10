```sh
node -e "const p=JSON.parse(require('fs').readFileSync('/Users/michael_hladky/WebstormProjects/nx-advanced-perf-logging/tmp-prof-test-2/CPU.20250510.023334.44038.0.001.cpuprofile')); console.log('Brief Profile Stats:\\n- Duration: ' + ((p.endTime-p.startTime)/1000).toFixed(1) + 'ms\\n- Total Nodes: ' + p.nodes.length + '\\n- Total Samples: ' + p.samples.length + '\\n- Avg Sample Interval: ' + (p.timeDeltas.reduce((a,b)=>a+b,0)/p.timeDeltas.length/1000).toFixed(1) + 'ms\\n- File Size: ' + (require('fs').statSync('/Users/michael_hladky/WebstormProjects/nx-advanced-perf-logging/tmp-prof-test-2/CPU.20250510.023334.44038.0.001.cpuprofile').size/1024).toFixed(1) + 'KB');"
```

```sh
Brief Profile Stats:
- Duration: 69.9ms
- Total Nodes: 354
- Total Samples: 3819
- Avg Sample Interval: 0.0ms
- File Size: 95.1KB
```
