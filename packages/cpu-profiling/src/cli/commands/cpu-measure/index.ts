import type { CommandModule } from 'yargs';
import type { MeasureArgs } from './types';
import { builder } from './builder';
import { handler } from './handler';

export const measureCommand: CommandModule<{}, MeasureArgs> = {
  command: 'cpu-measure',
  describe:
    'Run a Node.js script with CPU profiling enabled and save the profile to disk',
  builder,
  handler,
};

export default measureCommand;

export type { MeasureArgs } from './types';
