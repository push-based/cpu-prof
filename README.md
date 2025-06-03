# Cpu Profiling - Tools, Docs, Research

- [cpu-prof](./packages/cpu-prof/README.md) 🚀
- [@push-based/nx-perf](./packages/nx-perf/README.md) 

## Project Overviews 🌟

### [@push-based/cpu-prof](./packages/cpu-prof/README.md) 🚀

This package provides tools for Node.js CPU profiling. It allows users to collect and merge CPU profiles, and visualize them as Chrome trace files. Key features include smart defaults for easier profiling, intuitive error messages, the ability to merge multiple CPU profile files, and a TypeScript API for programmatic access. It offers CLI commands like `measure` to collect profiles and `merge` to combine them. It aims to simplify the usage of Node.js's built-in `--cpu-prof` capabilities and centralizes profile output.

###  **⚠️ DEPRECATED** [@push-based/nx-perf](./packages/nx-perf/README.md)

This tool focuses on visualizingexisting performance marks specifically for Nx CLI commands. It aims to provide more detailed insights than the default Nx performance logging. It generates flame graphs viewable in Chrome DevTools, showing time spent in functions and call stacks, including those from child processes.

> **⚠️ DEPRECATION NOTICE:** `@push-based/nx-perf` is an older or more rough version to profile Nx processes. `@push-based/cpu-prof` 🚀 is the more current and general-purpose tool for CPU profiling and is **highly recommended** for Nx projects.
