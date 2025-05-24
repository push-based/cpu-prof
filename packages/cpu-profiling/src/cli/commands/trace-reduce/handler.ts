import fs from 'fs';
import { reduceTrace } from '../../../lib/reduce-trace';
import type { ReduceTraceArgs } from './types';
import { processArgs } from './args-processor';
import { logVerboseOptions } from './helpers';

/**
 * Handle the reduce-trace command execution
 */
export async function handler(argv: ReduceTraceArgs): Promise<void> {
  try {
    const processedArgs = processArgs(argv);

    if (processedArgs.verbose) {
      logVerboseOptions(processedArgs);
    }

    // Read trace data
    const traceData = fs.readFileSync(processedArgs.inputFile, 'utf8');

    // Process with pure function
    const result = reduceTrace(traceData, processedArgs.filterOptions);

    // Write output
    fs.writeFileSync(processedArgs.outputFile, result.filteredTraceData);

    // Display statistics
    const originalSize = fs.statSync(processedArgs.inputFile).size;
    const cleanedSize = fs.statSync(processedArgs.outputFile).size;

    console.log(
      `📊 Original file: ${(originalSize / (1024 * 1024)).toFixed(2)} MB, ${
        result.stats.originalEventCount
      } events`
    );
    console.log(
      `📊 Cleaned file: ${(cleanedSize / (1024 * 1024)).toFixed(2)} MB, ${
        result.stats.filteredEventCount
      } events`
    );
    console.log(`📊 Events removed: ${result.stats.removedEventCount}`);
    console.log(
      `📊 Reduction ratio: ${(
        (result.stats.removedEventCount / result.stats.originalEventCount) *
        100
      ).toFixed(1)}%`
    );
    console.log(`✅ Reduced trace file created: ${processedArgs.outputFile}`);
    console.log(`✅ Original file preserved: ${processedArgs.inputFile}`);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}
