import type { CommandModule } from 'yargs';
// import { reduceTraceCommand } from '../commands/trace-reduce/index';
import { mergeCommand } from '../commands/cpu-merge/index';
import { measureCommand } from '../commands/cpu-measure/index';

/**
 * Registry of all available CLI commands
 */
export const commands: CommandModule<{}, any>[] = [
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
export { mergeCommand } from '../commands/cpu-merge/index';
export { measureCommand } from '../commands/cpu-measure/index';
