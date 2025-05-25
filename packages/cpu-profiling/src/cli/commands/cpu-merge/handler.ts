import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'path';
import type { MergeArgs, ProcessedMergeArgs } from './types';
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
async function handleCpuProfileMerge(
  processedArgs: ProcessedMergeArgs
): Promise<void> {
  const { inputDir, outputDir, verbose } = processedArgs;

  if (!inputDir || inputDir === '') {
    throw new Error('Input directory is required for CPU profile mode');
  }

  // Create output directory if it doesn't exist
  // The outputDir is a file path, so we need to create the directory containing the file.
  const outputDirectoryPath = join(outputDir, '..');
  mkdirSync(outputDirectoryPath, { recursive: true });

  if (verbose) {
    console.log(`🔧 Merging CPU profile files from: ${inputDir}`);
    console.log(`📁 Output file: ${outputDir}`);
  }

  // Use the existing mergeCpuProfileFiles function
  await mergeCpuProfileFiles(inputDir, outputDir);

  // Read the created file to get statistics
  const resultContent = await readFile(outputDir, 'utf8');
  const resultTrace = JSON.parse(resultContent);
  const eventCount = Array.isArray(resultTrace)
    ? resultTrace.length
    : resultTrace.traceEvents?.length || 0;

  console.log(`✅ CPU profiles merged successfully!`);
  console.log(`📊 Generated ${eventCount} trace events`);
  console.log(`📁 Output file: ${outputDir}`);
}
