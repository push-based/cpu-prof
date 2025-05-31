import type { CommandModule } from 'yargs';
import type { MeasureArgs } from './types';
import { builder } from './builder';
import { handler } from './handler';

/**
 * CPU measure command module for yargs
 */
export const measureCommand: CommandModule<{}, MeasureArgs> = {
  command: 'cpu-measure <command>',
  describe:
    'Run a command with CPU profiling enabled and save the profile to disk',
  builder,
  handler,
};

export default measureCommand;

// Re-export types for external use
export type { MeasureArgs } from './types';
