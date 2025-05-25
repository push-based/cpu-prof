import type { Argv } from 'yargs';
import {
  fileExists,
  isJsonFile,
  directoryExists,
} from '../../../lib/file-utils';
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
        'Output file path for merged trace. Defaults to inputDir/merged-profile.json if not specified.',
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
