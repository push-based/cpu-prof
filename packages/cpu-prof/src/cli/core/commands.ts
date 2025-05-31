import type { CommandModule } from 'yargs';
import { reduceTraceCommand } from '../commands/trace-reduce/index';
import { mergeCommand } from '../commands/cpu-merge/index';
import { measureCommand } from '../commands/cpu-measure/index';

/**
 * Registry of all available CLI commands
 */
export const commands: CommandModule<{}, any>[] = [
  reduceTraceCommand,
  mergeCommand,
  measureCommand,
];

export { reduceTraceCommand } from '../commands/trace-reduce/index';
export { mergeCommand } from '../commands/cpu-merge/index';
export { measureCommand } from '../commands/cpu-measure/index';
