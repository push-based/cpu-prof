import { findNewestTraceFile, generateOutputFilename } from '../../utils';
import type { ReduceTraceArgs, ProcessedArgs } from './types';

/**
 * Process and validate CLI arguments for the reduce-trace command
 */
export function processArgs(argv: ReduceTraceArgs): ProcessedArgs {
  // Handle input file (auto-select if not provided)
  const inputFile = argv.inputFile;
  const validatedInputFile = inputFile || findNewestTraceFile();
  if (!inputFile) {
    console.log(`📁 Auto-selected newest trace file: ${validatedInputFile}`);
  }

  // Handle output file
  const validatedOutputFile =
    argv.output || generateOutputFilename(validatedInputFile);

  return {
    inputFile: validatedInputFile,
    outputFile: validatedOutputFile,
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
