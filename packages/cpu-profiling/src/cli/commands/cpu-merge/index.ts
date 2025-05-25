import type { CommandModule } from 'yargs';
import type { MergeArgs } from './types';
import { builder } from './builder';
import { handler } from './handler';

/**
 * Merge command module for yargs
 */
export const mergeCommand: CommandModule<{}, MergeArgs> = {
  command: 'cpu-merge <inputDir>',
  describe:
    'Merge multiple Chrome DevTools trace files or CPU profile files into a single file',
  builder,
  handler,
};

export default mergeCommand;

// Re-export types and utilities for external use
export type { MergeArgs, ProcessedMergeArgs } from './types';
export { processArgs } from './args-processor';
