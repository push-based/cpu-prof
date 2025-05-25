import type {Argv} from 'yargs';
import {
    fileExists,
    isJsonFile,
    directoryExists,
} from '../../../lib/file-utils';
import type {MergeArgs} from './types';

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
        .option('input-dir', {
            alias: 'd',
            describe: 'Directory to search for trace files',
            type: 'string',
            normalize: true,
        })

        .group(['cpu-profiles', 'input-dir', 'output-dir'], 'CPU Profile Options:')
        .option('input-dir', {
            describe:
                'Input directory for merged trace file (for --cpu-profiles mode)',
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
            '$0 cpu-merge -d ./traces/',
            'Merge all files from directory'
        )
        .epilog(``)

        .check((argv) => {
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
