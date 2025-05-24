import type { CommandModule } from 'yargs';
import { reduceTraceCommand } from '../commands/trace-reduce/index';
import { mergeCommand } from '../commands/cpu-merge/index';

/**
 * Registry of all available CLI commands
 */
export const commands: CommandModule[] = [reduceTraceCommand, mergeCommand];

export { reduceTraceCommand } from '../commands/trace-reduce/index';
export { mergeCommand } from '../commands/cpu-merge/index';
