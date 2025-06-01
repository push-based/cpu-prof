import type { Argv } from 'yargs';
import { isAbsolute, join } from 'node:path';
import type { MeasureArgs } from './types';

export function builder(yargs: Argv): Argv<MeasureArgs> {
  return yargs
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
    .example(
      '$0 cpu-measure --cpu-prof-dir ./profiles node my_script.js --arg-for-script',
      'Profile `node my_script.js --arg-for-script` and save to ./profiles. Options can be anywhere.'
    )
    .example(
      '$0 cpu-measure node my_app.js --cpu-prof-name build-profile --cpu-prof-interval 500',
      'Profile `node my_app.js`, name it `build-profile` with 500ms interval. Options can be interspersed.'
    )
    .epilog(
      `The command to profile and its arguments are explicitly parsed via the command definition.\nCPU Measure options (like --cpu-prof-dir) can be placed anywhere.\n\nExamples:\n  $0 cpu-measure node my_script.js --arg-for-script\n  $0 cpu-measure --cpu-prof-dir ./custom-profiles node my_app.js\n  $0 cpu-measure node my_app.js --cpu-prof-interval 100`
    );
}
