import { readFile } from 'node:fs/promises';
import { join } from 'path';
import type { MergeArgs, ProcessedMergeArgs } from './types';
import { processArgs } from './args-processor';
import { mergeCpuProfileFiles } from '../../../lib/merge-cpuprofile-files';
import { generateTraceFilename } from './utils';

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
export async function handleCpuProfileMerge(
  processedArgs: ProcessedMergeArgs
): Promise<void> {
  const { inputDir, outputDir, verbose, smosh, startTracingInBrowser } =
    processedArgs;

  if (!inputDir || inputDir === '') {
    throw new Error('Input directory is required for CPU profile mode');
  }

  const outputFilePath = join(outputDir ?? inputDir, generateTraceFilename());

  if (verbose) {
    console.log(`🔧 Merging CPU profile files from: ${inputDir}`);
    console.log(`📄 Output file: ${outputFilePath}`);
    if (smosh) {
      console.log('✅ Smosh processes for better DX');
    }
    if (startTracingInBrowser) {
      console.log(`✅ Highlight process ${startTracingInBrowser}`);
    }
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
  console.log(` - 📊 Generated ${eventCount} trace events`);
  console.log(` - 📄 Output file: ${outputFilePath}`);
}
