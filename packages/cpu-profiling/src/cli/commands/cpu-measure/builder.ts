import type { Argv } from 'yargs';
import { isAbsolute, join } from 'node:path';
import type { MeasureArgs } from './types';

/**
 * Build the yargs command configuration for cpu-measure
 */
export function builder(yargs: Argv): Argv<MeasureArgs> {
  return yargs
    .positional('command_to_profile', {
      describe: 'The command to execute and profile (e.g., node, npm, npx)',
      type: 'string',
      demandOption: true,
    })
    .group(
      ['dir', 'interval', 'name', 'verbose', 'help'],
      'CPU Measure Options:'
    )
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
      '$0 cpu-measure node -e "console.log(42)" --dir ./profiles',
      'Profile `node -e "console.log(42)"` and save to ./profiles'
    )
    .example(
      '$0 cpu-measure npm run build --name build-profile --interval 500',
      'Profile `npm run build`, name it `build-profile` with 500ms interval'
    ).epilog(`
      Pass the command to profile and its arguments directly, followed by options for cpu-measure.
      Examples:
      $0 cpu-measure node my_script.js --arg-for-script
      $0 cpu-measure npm install --verbose
    `);
}
