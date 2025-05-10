# CPU Profiler

### Filename:

```shell
┌────────────────────────────────────────────────────────────┐
│  CPU.20250510.134625.51430.0.001.cpuprofile                │
│      │        │      │     │   │                           │
│      │        │      │     │   └────── %N = Sequence (001) ┘
│      │        │      │     └────────── %T = Thread ID (0)
│      │        │      └──────────────── %P = Process ID (51430)
│      │        └─────────────────────── %H = Time (134625 → 13:46:25)
│      └──────────────────────────────── %D = Date (20250510 → May 10, 2025)
└─────────────────────────────────────── Fixed prefix = "CPU"
```

`node --cpu-prof --cpu-prof-dir=tmp/worker packages/nx-perf/mocks/worker-children.mjs 3`
- CPU.20250510.135416.51623.0.001.cpuprofile
- CPU.20250510.135416.51623.1.002.cpuprofile
- CPU.20250510.135416.51623.2.003.cpuprofile
- CPU.20250510.135416.51623.3.004.cpuprofile

`node --cpu-prof --cpu-prof-dir=tmp/spawn packages/nx-perf/mocks/spawn-children.mjs 3`
- CPU.20250510.135416.51623.0.001.cpuprofile
- CPU.20250510.135416.51624.0.001.cpuprofile
- CPU.20250510.135416.51625.0.001.cpuprofile
- CPU.20250510.135416.51626.0.001.cpuprofile


## 🧠 What Creates New `PID` and `TID` in `.cpuprofile` Files?

### 🔹 `%P` → **Process ID (PID)**

- 🧬 Comes from the **OS-level process ID**
- A new PID is created whenever you start a **new process**, such as:
    - `child_process.fork()`
    - `child_process.spawn()`
    - `child_process.exec()`
    - Running `node` directly (CLI, script)

✅ Each process gets its **own `--cpu-prof` file** with a unique `%P`.

---

### 🔹 `%T` → **Thread ID (TID)**

- 🧠 Comes from **V8's internal thread registry**
- Most Node.js apps are single-threaded → TID = `0` or `1`
- A new TID is created **only when you spawn a `Worker`**:
    - `new Worker()` from `node:worker_threads`
    - Each worker gets a new `threadId` from the runtime

✅ Workers share the **same PID**, but get **distinct TIDs**, useful for trace merging.

---

### 🔁 Summary Table

| Mechanism                  | PID 🔢       | TID 🔢       | Notes                                             |
|----------------------------|--------------|--------------|---------------------------------------------------|
| `node app.js`              | ➖ (same)     | ➖ (main = 0) | Single process, single main thread               |
| `child_process.fork()`     | 🔼 (new)      | ➖ (main = 0) | New OS process, same threading model             |
| `new Worker()`             | ➖ (same PID) | 🔼 (new)      | New thread within same process                   |
| `.cpuprofile` per process  | 🔼 (yes)      | 🔼 (yes)      | Based on how V8 captures both process & thread ID|




```shell
node --cpu-prof --cpu-prof-interval=100 --cpu-prof-dir=tmp-prof-intervals --cpu-prof-name="empty-100.cpuprofile" packages/nx-perf/mocks/minimal-child-process.mjs
```

| Profile File                     | Sampling Interval | Duration  | Total Nodes | Total Samples | Avg Sample Interval | File Size |
|----------------------------------|-------------------|-----------|--------------|----------------|----------------------|-----------|
| `empty-1.cpuprofile`           | 1 µs              | 58.5 ms   | 472          | 10,514         | 0.0 ms               | 162.0 KB  |
| `empty-10.cpuprofile`          | 10 µs             | 17.5 ms   | 338          | 931            | 0.0 ms               | 73.3 KB   |
| `empty-100.cpuprofile`         | 100 µs            | 15.0 ms   | 153          | 100            | 0.1 ms               | 28.9 KB   |
| `empty-1000.cpuprofile`        | 1000 µs (1 ms)    | 13.9 ms   | 49           | 10             | 1.3 ms               | 8.6 KB    |
| `empty-10000.cpuprofile`       | 10000 µs (10 ms)  | 14.0 ms   | 3            | 2              | 6.9 ms               | 0.5 KB    |


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
