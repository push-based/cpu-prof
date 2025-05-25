import path from 'path';
import { isAbsolute, join } from 'node:path';
import type { MergeArgs, ProcessedMergeArgs } from './types';

/**
 * Process and validate CLI arguments for the merge command
 */
export function processArgs(argv: MergeArgs): ProcessedMergeArgs {
  let { inputDir, outputDir, verbose } = argv;

  if (!inputDir) {
    // Should be caught by yargs due to <inputDir> being required (demandOption)
    // and builder.ts check
    throw new Error('Input directory is required and was not provided.');
  }

  const resolvedInputDir = isAbsolute(inputDir)
    ? inputDir
    : join(process.cwd(), inputDir);

  let resolvedOutputDir: string;
  if (!outputDir) {
    resolvedOutputDir = join(resolvedInputDir, 'merged-profile.json');
  } else {
    // If outputDir is provided, resolve it relative to cwd if it's not absolute
    resolvedOutputDir = isAbsolute(outputDir)
      ? outputDir
      : join(process.cwd(), outputDir);
  }

  // outputDir is a file path, not a directory path for the output.
  // The actual directory where the file will be saved is derived from it.
  const actualOutputDirectoryPath = path.dirname(resolvedOutputDir);

  if (verbose) {
    console.log(`🔧 CPU Profile Merge Mode:`);
    console.log(`  📁 Input directory: ${resolvedInputDir}`);
    console.log(`  📁 Output file path: ${resolvedOutputDir}`);
    console.log(`  mkdir -p for: ${actualOutputDirectoryPath}`);
  }

  return {
    inputDir: resolvedInputDir,
    outputDir: resolvedOutputDir,
    verbose: verbose || false,
  };
}
