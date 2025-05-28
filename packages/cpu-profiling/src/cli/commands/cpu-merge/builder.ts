import type { Argv } from 'yargs';
import { directoryExists } from '../../../lib/file-utils';
import type { MergeArgs } from './types';

/**
 * Build the yargs command configuration for merge
 */
export function builder(yargs: Argv): Argv<MergeArgs> {
  return yargs
    .positional('inputDir', {
      describe: 'Directory containing CPU profile files to merge',
      type: 'string',
      normalize: true,
      demandOption: true,
    })
    .group(['help', 'verbose', 'output'], 'Basic Options:')
    .option('outputDir', {
      alias: 'o',
      describe:
        'Output directory for merged profiles. Defaults to inputDir if not specified.',
      type: 'string',
      normalize: true,
    })
    .option('smosh', {
      alias: 's',
      describe:
        'Merge profiles with specific ID normalization. Use --smosh to normalize both PID and TID, --smosh pid to normalize only PID, or --smosh tid to normalize only TID',
      type: 'string',
      choices: ['pid', 'tid'],
      coerce: (arg: string | boolean) => {
        // If --no-smosh is used, arg will be false
        if (arg === false) return false;
        // If --smosh is used without value, arg will be true
        if (arg === true) return true;
        // Otherwise it should be 'pid' or 'tid'
        return arg;
      },
      default: false,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    })

    .example(
      '$0 cpu-merge ./path/to/profiles',
      'Merge all profiles from a directory'
    )
    .epilog(``)

    .check((argv) => {
      const inputDirectory = argv.inputDir as string | undefined;

      if (!inputDirectory) {
        throw new Error('Input directory is required.');
      }

      if (inputDirectory && !directoryExists(inputDirectory)) {
        throw new Error(`Input directory does not exist: ${inputDirectory}`);
      }

      return true;
    });
}
