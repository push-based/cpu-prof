import path from 'path';
import { isAbsolute, join } from 'node:path';
import type { MergeArgs, ProcessedMergeArgs } from './types';

/**
 * Process and validate CLI arguments for the merge command
 */
export function processArgs(argv: MergeArgs): ProcessedMergeArgs {
  let { inputDir, outputDir, verbose, smosh } = argv;

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
    // If no output directory specified, use input directory
    resolvedOutputDir = resolvedInputDir;
  } else {
    // If outputDir is provided, resolve it relative to cwd if it's not absolute
    resolvedOutputDir = isAbsolute(outputDir)
      ? outputDir
      : join(process.cwd(), outputDir);
  }

  if (verbose) {
    console.log(`🔧 CPU Profile Merge Mode:`);
    console.log(`  📁 Input directory: ${resolvedInputDir}`);
    console.log(`  📁 Output directory: ${resolvedOutputDir}`);
    if (smosh) {
      console.log(
        `  🔄 Smosh mode enabled: ${
          smosh === true
            ? 'All profiles will be merged into a single thread'
            : smosh === 'pid'
            ? 'All profiles will share the same process ID'
            : 'All profiles will share the same thread ID'
        }`
      );
    }
  }

  return {
    inputDir: resolvedInputDir,
    outputDir: resolvedOutputDir,
    verbose: verbose || false,
    smosh: smosh || false,
  };
}
