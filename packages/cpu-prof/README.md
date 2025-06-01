# CPU Profiling and Profile Composition

The `@push-based/cpu-prof` package provides tools and utilities for collecting, and merging Node.js CPU profiles and and visualize them as Chrome trace files.
Measure, drag & drop into Chrome, voilà.

## Features

- **CPU Profile Collection**: Collect CPU profiles from Node.js processes.
- **Profile Merging**: Merge multiple CPU profile files into a single trace for easier analysis.
- **Helpful & Actionalble Errors**: Command-line interface for all major operations.
- **TypeScript API**: Programmatic access to all core features.

---

## Installation

```bash
npm install @push-based/cpu-prof
```

---

## CLI Usage

This guide provides instructions for using the `@push-based/cpu-prof` CLI.

### `measure` command

Collects CPU profiles from a Node.js process. It will handle the profiling arguments so you don't need to think about the order. Intuitive error messages as well as actionable feedback on how to fix the issue. All profiles end up in the same folder independent of the CWD. 

**Syntax:**
```bash
npx @push-based/cpu-prof measure [options] -- node your_script.js [args]
```

**Options:**
| Option                  | Default        | Description                                  |
|-------------------------|----------------|----------------------------------------------|
| `--cpu-prof-dir <dir>`  | `./profiles`   | Directory to save the profile                |
| `--cpu-prof-interval <ms>`| (not specified)| Sampling interval in milliseconds            |
| `--cpu-prof-name <name>`  | (auto-generated)| Name of the profile (auto-generated if not specified) |

**Examples:**
```bash
# Collect a profile and save it to ./profiles
npx @push-based/cpu-prof measure ./profiles node my_script.js --cpu-prof-dir --arg

# Collect a profile with a specific name and sampling interval
npx @push-based/cpu-prof measure node my_app.js --cpu-prof-name build-profile --cpu-prof-interval 500
```

---

### `merge` command

Merges multiple CPU profile files into a single trace file. This is helpful while debugging as you can see all profiles under each other aligned in time.

**Syntax:**
```bash
npx @push-based/cpu-prof merge <inputDir> [options]
```

**Parameters:**
| Parameter Type | Name                           | Default        | Description                                      |
|----------------|--------------------------------|----------------|--------------------------------------------------|
| Argument       | `<inputDir>`                   | (required)     | Directory containing CPU profile files to merge    |
| **Options**    |                                |                |                                                  |
|                | `--outputDir, -o <dir>`        | `<inputDir>`   | Output directory for merged profiles             |
|                | `--startTracingInBrowser, -b`  | `true`         | Include `TracingStartedInBrowser` event          |
|                | `--smosh, -s <mode>`           | (not specified)| Merge profiles with ID normalization (`all`, `pid`, `tid`) |
|                | `--verbose, -v`                | `false`        | Enable verbose logging                           |

**Example:**
```bash
# Merge profiles from ./profiles and save the output to ./merged
npx @push-based/cpu-prof merge ./profiles
```
