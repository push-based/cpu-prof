import type { CommandModule } from 'yargs';
// @TODO: add back in when we it is cleaned up and considered useful after research is trace event done.
// import { reduceTraceCommand } from '../commands/trace-reduce/index';
import { mergeCommand } from '../commands/merge/index';
import measureCommand from '../commands/measure/index';

/**
 * Registry of all available CLI commands
 */
export const commands: CommandModule<Record<string, unknown>, any>[] = [
  {
    ...measureCommand,
    command: '*',
  },
  measureCommand,
  mergeCommand,
  // @TODO: add back in when we it is cleaned up and considered useful after research is trace event done.
  // reduceTraceCommand,
];

export { reduceTraceCommand } from '../commands/trace-reduce/index';
export { mergeCommand } from '../commands/merge/index';
export { default as measureCommand } from '../commands/measure/index';
