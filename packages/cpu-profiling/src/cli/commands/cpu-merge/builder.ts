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
    .group(['help', 'version', 'verbose', 'output'], 'Basic Options:')
    .option('output', {
      alias: 'o',
      describe: 'Output file path for merged trace',
      type: 'string',
      normalize: true,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    })
    .option('pattern', {
      alias: 'p',
      describe:
        'File pattern to match when merging from directory (e.g., "*.json")',
      type: 'string',
      default: '*.json',
    })
    .option('directory', {
      alias: 'd',
      describe: 'Directory to search for trace files',
      type: 'string',
      normalize: true,
    })

    .group(['cpu-profiles', 'input-dir', 'output-dir'], 'CPU Profile Options:')
    .option('cpu-profiles', {
      describe: 'Merge CPU profile files (.cpuprof) instead of trace files',
      type: 'boolean',
      default: false,
    })
    .option('input-dir', {
      describe:
        'Input directory containing CPU profile files (for --cpu-profiles mode)',
      type: 'string',
      normalize: true,
      default: 'profiles',
    })
    .option('output-dir', {
      describe:
        'Output directory for merged trace file (for --cpu-profiles mode)',
      type: 'string',
      normalize: true,
      default: 'profiles',
    })

    .example('$0 cpu-merge file1.json file2.json', 'Merge two trace files')
    .example(
      '$0 cpu-merge file1.json file2.json -o merged.json',
      'Merge with custom output file'
    )
    .example(
      '$0 cpu-merge -d ./traces/ -p "*.json"',
      'Merge all JSON files from directory'
    )
    .example(
      '$0 cpu-merge --cpu-profiles',
      'Merge CPU profile files from "profiles" directory'
    )
    .example(
      '$0 cpu-merge --cpu-profiles --input-dir ./cpu-profiles --output-dir ./output',
      'Merge CPU profiles with custom directories'
    )

    .epilog(
      `
Default Behavior:
  • Normal mode: merges JSON trace files
  • --cpu-profiles mode: merges .cpuprof files into trace format
  • If no input files provided, searches current directory for *.json files
  • If no output file specified, creates merged.json in current directory
  • Files are merged in the order specified or found
    `
    )

    .check((argv) => {
      // CPU profile mode validation
      if (argv['cpu-profiles']) {
        if (
          argv['input-dir'] &&
          !directoryExists(argv['input-dir'] as string)
        ) {
          throw new Error(
            `Input directory does not exist: ${argv['input-dir']}`
          );
        }
        return true;
      }

      // Normal trace file mode validation
      const inputFiles = argv._ as string[];
      if (inputFiles && inputFiles.length > 0) {
        for (const file of inputFiles) {
          if (!fileExists(file)) {
            throw new Error(`Input file does not exist: ${file}`);
          }
          if (!isJsonFile(file)) {
            throw new Error(`Input file must be a JSON file: ${file}`);
          }
        }
      }

      // Validate directory if provided
      if (argv.directory && !directoryExists(argv.directory as string)) {
        throw new Error(`Directory does not exist: ${argv.directory}`);
      }

      // Ensure we have either input files or directory
      if ((!inputFiles || inputFiles.length === 0) && !argv.directory) {
        // Will use current directory with default pattern
        console.log(
          'No input files or directory specified, will search current directory for *.json files'
        );
      }

      return true;
    });
}
