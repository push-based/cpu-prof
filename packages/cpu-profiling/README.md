# PushBased Profiling

Advanced CPU profiling and trace file utilities for performance analysis.

## CLI Commands

### CPU Merge Command

The `cpu-merge` command supports two modes:

#### 1. Merge Trace Files (JSON)
Merge multiple Chrome DevTools trace files into a single file.

```sh
# Merge specific trace files
node packages/cpu-profiling/dist/profiling.esm.js cpu-merge file1.json file2.json

# Merge with custom output
node packages/cpu-profiling/dist/profiling.esm.js cpu-merge file1.json file2.json -o merged.json

# Merge all JSON files from directory
node packages/cpu-profiling/dist/profiling.esm.js cpu-merge -d ./traces/
```

#### 2. Merge CPU Profile Files (.cpuprof)
Convert and merge CPU profile files into a trace format.

```sh
# Merge CPU profiles from default directory (profiles)
node packages/cpu-profiling/dist/profiling.esm.js cpu-merge --cpu-profiles

# Merge with custom directories
node packages/cpu-profiling/dist/profiling.esm.js cpu-merge --cpu-profiles --input-dir ./cpuprofiles --output-dir ./traces
```

### Trace Reduce Command

Reduce the size of Chrome DevTools trace files by filtering events.

```sh
# Basic usage
node packages/cpu-profiling/dist/profiling.esm.js trace-reduce input.json

# With options
node packages/cpu-profiling/dist/profiling.esm.js trace-reduce input.json --output reduced.json --verbose
```

## Available Commands

```sh
# Show help
node packages/cpu-profiling/dist/profiling.esm.js --help

# CPU merge commands
node packages/cpu-profiling/dist/profiling.esm.js cpu-merge --help
node packages/cpu-profiling/dist/profiling.esm.js cpu-merge --cpu-profiles --help

# Trace reduce commands  
node packages/cpu-profiling/dist/profiling.esm.js trace-reduce --help
```

## Options

### CPU Merge Command Options

| Option              | Shorthand | Description                                     |
|--------------------|-----------|-------------------------------------------------|
| `--output`         | `-o`      | Output file path                               |
| `--verbose`        | `-v`      | Enable verbose logging                         |
| `--directory`      | `-d`      | Directory to search for trace files           |
| `--pattern`        | `-p`      | File pattern (default: "*.json")              |
| `--cpu-profiles`   |           | Merge CPU profile files instead of traces     |
| `--input-dir`      |           | Input directory for CPU profiles (default: "profiles") |
| `--output-dir`     |           | Output directory for CPU profiles (default: "profiles") |
