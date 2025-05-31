import type { Argv } from 'yargs';
import { isAbsolute, join } from 'node:path';
import type { MeasureArgs } from './types';

/**
 * Build the yargs command configuration for cpu-measure
 */
export function builder(yargs: Argv): Argv<MeasureArgs> {
  return (
    yargs
      .parserConfiguration({ 'populate--': true })
      // .positional('command_to_profile', { // Removed as it is now handled by --
      //   describe: 'The command to execute and profile (e.g., node, npm, npx)',
      //   type: 'string',
      //   demandOption: true,
      // })
      .group(
        ['dir', 'interval', 'name', 'verbose', 'help'],
        'CPU Measure Options:'
      )
      .option('interval', {
        alias: 'i',
        describe: 'Interval in milliseconds to sample the command.',
        type: 'number',
      })
      .option('dir', {
        alias: 'd',
        describe: 'Directory to save the profile.',
        type: 'string',
        normalize: true,
        default: join(process.cwd(), 'profiles'),
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
        '$0 cpu-measure -- my_script.js --arg-for-script --dir ./profiles',
        'Profile `node my_script.js --arg-for-script` and save to ./profiles'
      )
      .example(
        '$0 cpu-measure -- my_app.js --name build-profile --interval 500',
        'Profile `node my_app.js`, name it `build-profile` with 500ms interval'
      ).epilog(`
      Pass the Node.js script to profile and its arguments after "--".
      Examples:
      $0 cpu-measure -- my_script.js --arg-for-script
      $0 cpu-measure -- app.js --verbose
    `)
  );
}
