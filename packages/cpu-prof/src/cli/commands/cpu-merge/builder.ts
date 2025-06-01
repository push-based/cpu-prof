import type { Argv } from 'yargs';
import { directoryExists } from '../../../lib/file-utils';
import type { MergeArgs } from './types';
import { join } from 'path';

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
    .group(['help', 'verbose'], 'Basic Options:')
    .option('outputDir', {
      alias: 'o',
      describe:
        'Output directory for merged profiles. Defaults to inputDir if not specified.',
      type: 'string',
      normalize: true,
      default: join(process.cwd(), 'profiles'),
    })
    .option('startTracingInBrowser', {
      alias: 'b',
      describe:
        'Include TracingStartedInBrowser event for better DevTools visualization',
      type: 'boolean',
      default: false,
    })
    .option('smosh', {
      alias: 's',
      describe:
        'Merge profiles with specific ID normalization. Use --smosh all to normalize both PID and TID, --smosh pid to normalize only PID, or --smosh tid to normalize only TID. Omit flag to disable normalization.',
      type: 'string',
      choices: ['pid', 'tid', 'all', 'off'],
      default: 'off',
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    })

    .example(
      '$0 merge ./path/to/profiles',
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
    }) as Argv<MergeArgs>;
}
