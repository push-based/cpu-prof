import type { Argv } from 'yargs';
import { isAbsolute, join } from 'node:path';
import type { MeasureArgs } from './types';

/**
 * Build the yargs command configuration for cpu-measure
 */
export function builder(yargs: Argv): Argv<MeasureArgs> {
  return yargs
    .positional('command', {
      describe: 'Command to measure',
      type: 'string',
      normalize: true,
      demandOption: true,
    })
    .group(['help', 'verbose'], 'Basic Options:')
    .option('args', {
      alias: 'a',
      describe:
        'Arguments for the command to measure (space-separated string).',
      type: 'string',
      normalize: true,
      default: '',
    })
    .option('interval', {
      alias: 'i',
      describe: 'Interval in milliseconds to sample the command.',
      type: 'number',
      default: 1000,
    })
    .option('dir', {
      alias: 'd',
      describe: 'Directory to save the profile.',
      type: 'string',
      normalize: true,
      default: process.cwd(),
      coerce: (dir: string) => {
        return isAbsolute(dir) ? dir : join(process.cwd(), dir);
      },
    })
    .option('name', {
      alias: 'n',
      describe: 'Name of the profile (auto-generated if not specified).',
      type: 'string',
      normalize: true,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    })

    .example(
      '$0 cpu-measure node --args="./index.js"',
      'Measure the command node with arguments ./index.js'
    )
    .example(
      '$0 cpu-measure npm --args="run build" --interval=500 --dir="./profiles" --name="build-profile"',
      'Measure npm run build with 500ms interval, saving to ./profiles directory with name build-profile'
    ).epilog(`
      Examples:
      $0 cpu-measure node --args="./index.js"
      $0 cpu-measure npm --args="run build" --interval=500 --dir="./profiles" --name="build-profile"
    `);
}
