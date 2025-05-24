import fs from 'fs';
import path from 'path';
import { isAbsolute, join } from 'node:path';
import type { MergeArgs, ProcessedMergeArgs } from './types';

/**
 * Process and validate CLI arguments for the merge command
 */
export function processArgs(argv: MergeArgs): ProcessedMergeArgs {
  // Check if we're in CPU profile mode
  if (argv.cpuProfiles || (argv as any)['cpu-profiles']) {
    return processCpuProfileArgs(argv);
  }

  // Regular trace file mode
  return processTraceFileArgs(argv);
}

/**
 * Process arguments for CPU profile merging mode
 */
function processCpuProfileArgs(argv: MergeArgs): ProcessedMergeArgs {
  const inputDir = argv.inputDir || (argv as any)['input-dir'] || 'profiles';
  const outputDir = argv.outputDir || (argv as any)['output-dir'] || 'profiles';

  const resolvedInputDir = isAbsolute(inputDir)
    ? inputDir
    : join(process.cwd(), inputDir);
  const resolvedOutputDir = isAbsolute(outputDir)
    ? outputDir
    : join(process.cwd(), outputDir);
  const outputFile =
    argv.output || join(resolvedOutputDir, 'cpu-profiles-trace.json');

  if (!inputDir || inputDir === '') {
    throw new Error('Input directory is required for CPU profile mode');
  }

  if (argv.verbose) {
    console.log(`🔧 CPU Profile Mode:`);
    console.log(`  📁 Input directory: ${resolvedInputDir}`);
    console.log(`  📁 Output directory: ${resolvedOutputDir}`);
    console.log(`  📁 Output file: ${outputFile}`);
  }

  return {
    inputFiles: [], // Will be populated by the handler
    outputFile,
    verbose: argv.verbose || false,
    isCpuProfileMode: true,
    inputDirectory: resolvedInputDir,
    outputDirectory: resolvedOutputDir,
  };
}

/**
 * Process arguments for regular trace file merging mode
 */
function processTraceFileArgs(argv: MergeArgs): ProcessedMergeArgs {
  const inputFiles = (argv._ as string[]) || [];
  let validatedInputFiles: string[] = [];

  // Handle different input scenarios
  if (argv.directory) {
    // Search directory for files matching pattern
    validatedInputFiles = findFilesInDirectory(
      argv.directory,
      argv.pattern || '*.json'
    );
    if (argv.verbose) {
      console.log(
        `Found ${validatedInputFiles.length} files in directory: ${argv.directory}`
      );
      validatedInputFiles.forEach((file) => console.log(`  - ${file}`));
    }
  } else if (inputFiles.length > 0) {
    // Use provided input files
    validatedInputFiles = inputFiles;
  } else {
    // Search current directory for JSON files
    validatedInputFiles = findFilesInDirectory('.', '*.json');
    if (argv.verbose) {
      console.log(
        `Auto-found ${validatedInputFiles.length} JSON files in current directory`
      );
      validatedInputFiles.forEach((file) => console.log(`  - ${file}`));
    }
  }

  if (validatedInputFiles.length === 0) {
    throw new Error('No input files found to merge');
  }

  if (validatedInputFiles.length === 1) {
    throw new Error('At least two files are required for merging');
  }

  // Handle output file
  const validatedOutputFile = argv.output || 'merged.json';

  return {
    inputFiles: validatedInputFiles,
    outputFile: validatedOutputFile,
    verbose: argv.verbose || false,
    isCpuProfileMode: false,
  };
}

/**
 * Find files in directory matching pattern
 */
function findFilesInDirectory(directory: string, pattern: string): string[] {
  try {
    const files = fs.readdirSync(directory);
    const jsonFiles = files.filter((file) => {
      const fullPath = path.join(directory, file);
      const stats = fs.statSync(fullPath);
      return stats.isFile() && file.endsWith('.json');
    });

    return jsonFiles.map((file) => path.join(directory, file));
  } catch (error) {
    throw new Error(
      `Error reading directory ${directory}: ${(error as Error).message}`
    );
  }
}
