import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { readdir } from 'fs/promises';
import { join, basename } from 'path';
import type { MergeArgs } from './types';
import { processArgs } from './args-processor';

// Import CPU profile related functionality
import { mergeCpuProfileFiles } from '../../../lib/merge-cpuprofile-files';

/**
 * Handle the merge command execution
 */
export async function handler(argv: MergeArgs): Promise<void> {
  try {
    const processedArgs = processArgs(argv);
    await handleCpuProfileMerge(processedArgs);
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Handle CPU profile merging (original bin.ts logic)
 */
async function handleCpuProfileMerge(processedArgs: any): Promise<void> {
  const { inputDirectory, outputDirectory, outputFile, verbose } =
    processedArgs;

  if (!inputDirectory || inputDirectory === '') {
    throw new Error('Input directory is required for CPU profile mode');
  }

  // Create output directory if it doesn't exist
  if (outputDirectory) {
    mkdirSync(outputDirectory, { recursive: true });
  }

  if (verbose) {
    console.log(`🔧 Merging CPU profile files from: ${inputDirectory}`);
    console.log(`📁 Output file: ${outputFile}`);
  }

  // Use the existing mergeCpuProfileFiles function
  await mergeCpuProfileFiles(inputDirectory, outputFile);

  // Read the created file to get statistics
  const resultContent = await readFile(outputFile, 'utf8');
  const resultTrace = JSON.parse(resultContent);
  const eventCount = Array.isArray(resultTrace)
    ? resultTrace.length
    : resultTrace.traceEvents?.length || 0;

  console.log(`✅ CPU profiles merged successfully!`);
  console.log(`📊 Generated ${eventCount} trace events`);
  console.log(`📁 Output file: ${outputFile}`);
}

/**
 * Merge multiple trace files into a single trace
 */
function mergeTraces(traces: any[], verbose: boolean): any {
  if (traces.length === 0) {
    throw new Error('No traces to merge');
  }

  // Determine the format of the first trace to use as template
  const firstTrace = traces[0];
  const isArrayFormat = Array.isArray(firstTrace);

  if (verbose) {
    console.log(
      `🔧 Detected trace format: ${
        isArrayFormat ? 'Array' : 'Object with traceEvents'
      }`
    );
  }

  if (isArrayFormat) {
    // Array format: just concatenate all events
    const allEvents: any[] = [];
    for (const trace of traces) {
      if (Array.isArray(trace)) {
        allEvents.push(...trace);
      } else {
        console.warn(
          `Warning: Mixed trace formats detected. Converting object format to array format.`
        );
        if (trace.traceEvents) {
          allEvents.push(...trace.traceEvents);
        }
      }
    }
    return allEvents;
  } else {
    // Object format: merge traceEvents and preserve metadata from first trace
    const mergedTrace = {
      ...firstTrace,
      traceEvents: [] as any[],
    };

    for (const trace of traces) {
      if (trace.traceEvents && Array.isArray(trace.traceEvents)) {
        mergedTrace.traceEvents.push(...trace.traceEvents);
      } else if (Array.isArray(trace)) {
        console.warn(
          `Warning: Mixed trace formats detected. Converting array format to object format.`
        );
        mergedTrace.traceEvents.push(...trace);
      }
    }

    return mergedTrace;
  }
}
