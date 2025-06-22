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
    .group(['help', 'verbose'], 'Basic Options:')
    .option('outputDir', {
      alias: 'o',
      describe:
        'Output directory for merged profiles. Defaults to inputDir if not specified.',
      type: 'string',
      normalize: true,
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
        'Smosh the profiles together into one PID with indexed TIDs to create a single profile file',
      type: 'boolean',
      default: false,
    })
    .option('focusMain', {
      describe:
        'Shorthand for --smosh and --startTracingInBrowser. Focuses on the main thread and prepares for browser DevTools.',
      type: 'boolean',
      default: true,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    })

    .example(
      'merge ./path/to/profiles',
      'Merge all CPU profiles from a directory into 1 trace file'
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

      if (argv.focusMain) {
        argv.smosh = true;
        argv.startTracingInBrowser = true;
      }

      return true;
    }) as Argv<MergeArgs>;
}
