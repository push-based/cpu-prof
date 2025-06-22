import type { Argv, CommandModule } from 'yargs';
import { isAbsolute, join } from 'node:path';
import type { MeasureArgs } from './types';
import { handler } from './handler';

export const measureCommand: CommandModule<{}, MeasureArgs> = {
  command: 'measure <commandToProfile...>',
  describe:
    'Run a Node.js script with CPU profiling enabled and save the profile to disk',
  builder: (yargs: Argv): Argv<MeasureArgs> => {
    return yargs
      .positional('commandToProfile', {
        describe: 'Command and arguments to profile',
        type: 'string',
        array: true,
      })
      .group(
        ['cpu-prof-dir', 'cpu-prof-interval', 'cpu-prof-name', 'help'],
        'CPU Measure Options:'
      )
      .option('cpu-prof-interval', {
        describe: 'Interval in milliseconds to sample the command.',
        type: 'number',
      })
      .option('cpu-prof-dir', {
        describe: 'Directory to save the profile.',
        type: 'string',
        normalize: true,
        default: join(process.cwd(), 'profiles'),
        coerce: (dir: string) => {
          return isAbsolute(dir) ? dir : join(process.cwd(), dir);
        },
      })
      .option('cpu-prof-name', {
        describe: 'Name of the profile (auto-generated if not specified).',
        type: 'string',
        normalize: true,
      })
      .option('flagMain', {
        describe:
          'Adds prefix and command args to the profile name of the initial process.',
        type: 'boolean',
        default: true,
      })
      .option('merge', {
        describe:
          'Merge the profile into a single file. You can run the command separatly by passing false and using the merge command.',
        type: 'boolean',
        default: true,
      })
      .example(
        '$0 measure --cpu-prof-dir ./profiles node my_script.js --arg-for-script',
        'Profile `node my_script.js --arg-for-script` and save to ./profiles. Options can be anywhere.'
      )
      .example(
        '$0 measure node my_app.js --cpu-prof-name build-profile --cpu-prof-interval 500',
        'Profile `node my_app.js`, name it `build-profile` with 500ms interval. Options can be interspersed.'
      )
      .epilog(
        `The command to profile and its arguments are explicitly parsed via the command definition.
        CPU Measure options (like --cpu-prof-dir) can be placed anywhere.
        
        Examples:
        $0 measure node my_script.js --arg-for-script
        $0 measure --cpu-prof-dir ./custom-profiles node my_app.js
        $0 measure node my_app.js --cpu-prof-interval 100`
      );
  },
  handler,
};
