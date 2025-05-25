# Advanced Performance Profiling for Nx

| Default                                                                | Advanced                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ![flame-charts.png](./tools/imgs/nx-default-profile.png)               | ![flame-charts.png](./tools/imgs/main-and-forked-process-flame-charts.png) |
| `NX_DAEMON=false NX_PERF_LOGGING=true NX_CACHE=false nx show projects` | `node ./profile.ts --args=show,projects`                       |

Nx is boosting performance, yet when there is a question, it is not always easy to understand where the time is spent.
By default, Nx provides a way to profile the performance of the CLI commands using `NX_PERF_LOGGING=true` and `NX_DAEMON=false`.
This will create a minimal text log in the terminal.

This script provides a way to profile the performance of the Nx CLI commands in high detail and in a great UI, the Chrome DevTools.
It will create a flame graph that shows the time spent in each function and the call stack, including the ones from child processes

## Main Process Logging

1. Copy the `tools` folder into your workspace root.
2. Run `node ./tools/bin.ts`.  
   The script will create a file named `.nx-profiling/nx-show-projects.<Date.now()>.profile.json`.
3. Open Chrome browser
   1. Open DevTools
   2. Go to the `Performance` tab
   3. Drag and drop the `<process>.profile.json` file into the DevTools window.

![flame-charts.png](./tools/imgs/main-process-flame-charts.png)

## Main and Forked Process Logging

1. Run `node ./tools/postinstall.ts`. This modifies the Nx sourcecode to be patched. (Don't forget
   to revert your changes)
2. Run `node ./tools/bin.ts --noPatch`. (As it is now patched inside the file directly)
3. Open DevTools

![flame-charts.png](./tools/imgs/main-and-forked-process-flame-charts.png)

## Terminal Arguments

| Option      | Shorthand | Description                               |
| ----------- | --------- |-------------------------------------------|
| `--args`    |           | comma separated process `--args=-t,build` |
| `--verbose` | `-v`      | Show verbose output                       |
| `--noPatch` | `-p`      | Don't patch the Nx sourcecode             |
| `--outDir`  | `-d`      | Output directory                          |
| `--outFile` | `-f`      | Output file                               |

**Example**

```sh
node ./tools/bin.ts --args=show,projects
node ./tools/bin.ts --args=show,projects --verbose
node ./tools/bin.ts -v -p -o./tools/demo -f=nx-show-projects.json
```


---

here is a example of a scheme explaining data structure

### heading

description

```ts
export interface XY {
}
```

additional information relevant afterreading the type.

explanation for the example profile

**Filename:**
`CPU.20250510.135416.51623.0.001.cpuprofile`

**Profile content:**
```json
###
```

**DevTools Performance Tab:**  
<img src=".." alt=".." width="800">

---

can you try to implement the same schema in cpu-profiling.md.

first explain the schema then look for places then refacotr


---

## Update ToC ->  `grep`-Sync Markdown TOC

**1. Get Headings:**
   ```bash
   grep -n "^##\\+ " your-file.md 
   ```
   (`-n`=line numbers; `^##\\+ `=headings H2-H6).

**2. Analyze & Rebuild TOC:**
   Compare `grep` output to your TOC in `your-file.md`. Edit TOC to match `grep` data:

   *   **Hierarchy Mapping (from `grep` `^##\\+ ` to TOC indent):**
       *   `##`: `**[Text](#link)**` (0 spaces indent)
       *   `###`: `- [Text](#link)` (2 spaces indent)
       *   `####`: `- [Text](#link)` (4 spaces indent)
       *   (etc., +2 spaces/level, no `**`)
   *   **Anchor Links (`#link`):** Lowercase heading, spaces to hyphens.

**Example Fix (`cpu-profiling.md` "Data Structure" section):**
   `grep` showed `### Dimensions and Time` under `## Data Structure`.
   TOC changed from:
   ```markdown
   - **[Data Structure](#data-structure)**
   - **[Dimensions and Time](#dimensions-and-time)** 
   ```
   To (correctly nested):
   ```markdown
   - **[Data Structure](#data-structure)**
     - [Dimensions and Time](#dimensions-and-time)
   ```

---