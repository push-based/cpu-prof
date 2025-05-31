import type { CommandModule } from 'yargs';
import type { ReduceTraceArgs } from './types';
import { builder } from './builder';
import { handler } from './handler';

export const reduceTraceCommand: CommandModule<{}, ReduceTraceArgs> = {
  command: 'trace-reduce [inputFile]',
  describe: 'Reduce Chrome DevTools trace files by filtering unwanted events',
  builder,
  handler,
};

export default reduceTraceCommand;

export type { ReduceTraceArgs, ProcessedArgs, ValidatedArgs } from './types';
export { processArgs } from './args-processor';
export { logVerboseOptions } from './helpers';
