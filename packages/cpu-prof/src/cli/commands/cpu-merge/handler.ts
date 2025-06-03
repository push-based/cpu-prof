import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'path';
import type { MergeArgs, ProcessedMergeArgs } from './types';
import { processArgs } from './args-processor';
import { mergeCpuProfileFiles } from '../../../lib/merge-cpuprofile-files';

/**
 * Handle the merge command execution
 */
export async function handler(argv: MergeArgs): Promise<void> {
  const processedArgs = processArgs(argv);

  try {
    await handleCpuProfileMerge(processedArgs);
  } catch (error) {
    console.error(
      '❌ Error in cpu-merge command handler:',
      (error as Error).message
    );
    process.exit(1);
  }
}

/**
 * Handle CPU profile merging (original bin.ts logic)
 */
async function handleCpuProfileMerge(
  processedArgs: ProcessedMergeArgs
): Promise<void> {
  const { inputDir, outputDir, verbose, smosh, startTracingInBrowser } =
    processedArgs;

  if (!inputDir || inputDir === '') {
    throw new Error('Input directory is required for CPU profile mode');
  }

  // Create an output directory if it doesn't exist
  mkdirSync(outputDir, { recursive: true });

  // Define the output file path inside the output directory
  const outputFilePath = join(outputDir, 'merged-profile.json');

  if (verbose) {
    console.log(`🔧 Merging CPU profile files from: ${inputDir}`);
    console.log(`📄 Output file: ${outputFilePath}`);
  }

  // Use the existing mergeCpuProfileFiles function with the full file path
  await mergeCpuProfileFiles(inputDir, outputFilePath, {
    smosh: smosh ? 'pid' : 'off',
    startTracingInBrowser,
  });

  // Read the created file to get statistics
  const resultContent = await readFile(outputFilePath, 'utf8');
  const resultTrace = JSON.parse(resultContent);
  const eventCount = Array.isArray(resultTrace)
    ? resultTrace.length
    : resultTrace.traceEvents?.length || 0;

  console.log(`✅ CPU profiles merged successfully!`);
  console.log(`📊 Generated ${eventCount} trace events`);
  console.log(`📄 Output file: ${outputFilePath}`);
}
