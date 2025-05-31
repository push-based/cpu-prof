import fs from 'fs';
import { reduceTrace, reduceTraceFile } from '../../../lib/reduce-trace';
import type { ReduceTraceArgs } from './types';
import { processArgs } from './args-processor';
import { logVerboseOptions, getStats, logStats } from './helpers';
/**
 * Handle the reduce-trace command execution
 */
export async function handler(argv: ReduceTraceArgs): Promise<void> {
  try {
    const processedArgs = processArgs(argv);

    if (processedArgs.verbose) {
      logVerboseOptions(processedArgs);
    }

    // Use helper function to process the trace file
    const result = reduceTraceFile(
      processedArgs.inputFile,
      processedArgs.outputFile,
      processedArgs.filterOptions
    );

    // Display statistics using helper functions
    const stats = getStats(result);
    logStats(stats);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}
