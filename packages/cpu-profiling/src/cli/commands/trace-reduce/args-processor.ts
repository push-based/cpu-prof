import type { ReduceTraceArgs, ProcessedArgs } from './types';

/**
 * Process and validate CLI arguments for the reduce-trace command
 * Note: Default input/output file handling is now done by yargs middleware
 */
export function processArgs(
  argv: ReduceTraceArgs,
  logger = console
): ProcessedArgs {
  // Input and output files are now handled by middleware
  const inputFile = argv.inputFile!; // Safe to assert since middleware ensures it's set
  const outputFile = argv.output!; // Safe to assert since middleware ensures it's set

  if (argv.verbose) {
    // Verbose logging is handled elsewhere - this just indicates middleware was used
    logger.log(`📁 Using input file: ${inputFile}`);
    logger.log(`📁 Using output file: ${outputFile}`);
  }

  return {
    inputFile,
    outputFile,
    verbose: argv.verbose || false,
    filterOptions: {
      filterNetwork: argv.network ?? true,
      filterAnimation: argv.animation ?? true,
      filterGPU: argv.gpu ?? true,
      filterThreadPool: argv.threadpool ?? true,
      filterStreamingCompile: argv.streamingcompile ?? true,
      durMin: argv['dur-min'],
      durMax: argv['dur-max'],
      tsMin: argv['ts-min'],
      tsMax: argv['ts-max'],
      includePhases: argv['include-phases'],
      excludePhases: argv['exclude-phases'],
      includePids: argv['include-pids'],
      excludePids: argv['exclude-pids'],
      includeTids: argv['include-tids'],
      excludeTids: argv['exclude-tids'],
      includeNames: argv['include-names'],
      excludeNames: argv['exclude-names'],
      includeCats: argv['include-cats'],
      excludeCats: argv['exclude-cats'],
    },
  };
}
