import type { Argv } from 'yargs';
import path from 'path';
import { DEFAULT_FILTER_OPTIONS } from '../../../lib/reduce-trace';
import {
  fileExists,
  isJsonFile,
  directoryExists,
} from '../../../lib/file-utils';
import type { ReduceTraceArgs } from './types';
import {
  coerceStringArray,
  coerceNumberArray,
  coerceStringArrayWithDefaults,
} from '../../../utils';

/**
 * Build the yargs command configuration for reduce-trace
 */
export function builder(yargs: Argv): Argv<ReduceTraceArgs> {
  return yargs
    .positional('inputFile', {
      describe: 'Path to the input trace file (JSON format)',
      type: 'string',
      normalize: true,
    })
    .group(['help', 'version', 'verbose', 'output'], 'Basic Options:')
    .option('output', {
      alias: 'o',
      describe: 'Output file path',
      type: 'string',
      normalize: true,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Enable verbose logging',
      type: 'boolean',
      default: false,
    })

    .group(
      ['network', 'animation', 'gpu', 'threadpool', 'streamingcompile'],
      'Event Type Filtering:'
    )
    .option('network', {
      describe: 'Enable network event filtering',
      type: 'boolean',
      default: true,
    })
    .option('animation', {
      describe: 'Enable animation event filtering',
      type: 'boolean',
      default: true,
    })
    .option('gpu', {
      describe: 'Enable GPU event filtering',
      type: 'boolean',
      default: true,
    })
    .option('threadpool', {
      describe: 'Enable ThreadPool event filtering',
      type: 'boolean',
      default: true,
    })
    .option('streamingcompile', {
      describe: 'Enable StreamingCompile event filtering',
      type: 'boolean',
      default: true,
    })

    .group(
      [
        'include-phases',
        'exclude-phases',
        'include-pids',
        'exclude-pids',
        'include-tids',
        'exclude-tids',
      ],
      'Advanced Filtering:'
    )
    .option('include-phases', {
      describe: 'Comma-separated list of event phases to include (e.g., B,E,X)',
      type: 'array',
      coerce: coerceStringArray,
    })
    .option('exclude-phases', {
      describe: 'Comma-separated list of event phases to exclude (e.g., M,I)',
      type: 'array',
      coerce: coerceStringArray,
    })
    .option('include-pids', {
      describe: 'Comma-separated list of Process IDs to include',
      type: 'array',
      coerce: (arg) => coerceNumberArray(arg, 'PID'),
    })
    .option('exclude-pids', {
      describe: 'Comma-separated list of Process IDs to exclude',
      type: 'array',
      coerce: (arg) => coerceNumberArray(arg, 'PID'),
    })
    .option('include-tids', {
      describe: 'Comma-separated list of Thread IDs to include',
      type: 'array',
      coerce: (arg) => coerceNumberArray(arg, 'TID'),
    })
    .option('exclude-tids', {
      describe: 'Comma-separated list of Thread IDs to exclude',
      type: 'array',
      coerce: (arg) => coerceNumberArray(arg, 'TID'),
    })

    .group(
      ['include-names', 'exclude-names', 'include-cats', 'exclude-cats'],
      'Name & Category Filtering:'
    )
    .option('include-names', {
      describe: 'Comma-separated list of event names to include',
      type: 'array',
      coerce: coerceStringArray,
    })
    .option('exclude-names', {
      describe: `Comma-separated list of event names to exclude (default: ${DEFAULT_FILTER_OPTIONS.excludeNames?.join(
        ','
      )})`,
      type: 'array',
      default: DEFAULT_FILTER_OPTIONS.excludeNames,
      coerce: (arg) =>
        coerceStringArrayWithDefaults(arg, DEFAULT_FILTER_OPTIONS.excludeNames),
    })
    .option('include-cats', {
      describe: 'Comma-separated list of event categories to include',
      type: 'array',
      coerce: coerceStringArray,
    })
    .option('exclude-cats', {
      describe: `Comma-separated list of event categories to exclude (default: ${DEFAULT_FILTER_OPTIONS.excludeCats?.join(
        ','
      )})`,
      type: 'array',
      default: DEFAULT_FILTER_OPTIONS.excludeCats,
      coerce: (arg) =>
        coerceStringArrayWithDefaults(arg, DEFAULT_FILTER_OPTIONS.excludeCats),
    })

    .group(
      ['dur-min', 'dur-max', 'ts-min', 'ts-max'],
      'Duration & Timestamp Filtering:'
    )
    .option('dur-min', {
      describe: `Filter out events shorter than specified duration in microseconds (default: ${DEFAULT_FILTER_OPTIONS.durMin}μs)`,
      type: 'number',
      default: DEFAULT_FILTER_OPTIONS.durMin,
    })
    .option('dur-max', {
      describe:
        'Filter out events longer than specified duration in microseconds',
      type: 'number',
    })
    .option('ts-min', {
      describe:
        'Filter out events with timestamp earlier than specified in microseconds',
      type: 'number',
    })
    .option('ts-max', {
      describe:
        'Filter out events with timestamp later than specified in microseconds',
      type: 'number',
    })

    .example(
      '$0 trace-reduce trace.json',
      'Reduce trace.json with default filters'
    )
    .example(
      '$0 trace-reduce trace.json -o cleaned.json -v',
      'Reduce with custom output and verbose logging'
    )
    .example(
      '$0 trace-reduce --no-network --no-gpu trace.json',
      'Reduce keeping network and GPU events'
    )
    .example(
      '$0 trace-reduce --include-cats blink,v8 trace.json',
      'Include only blink and v8 categories'
    )
    .example(
      '$0 trace-reduce --dur-min 1000 --dur-max 50000 trace.json',
      'Filter by duration range'
    )

    .epilog(
      `
Default Behavior:
  • Network, animation, GPU, ThreadPool, StreamingCompile filtering: enabled
  • v8.compile category filtering: enabled  
  • Minimum duration filtering: ${DEFAULT_FILTER_OPTIONS.durMin}μs
  • Default excluded names: ${DEFAULT_FILTER_OPTIONS.excludeNames?.join(', ')}
  • If no input file provided, uses newest .json file from ./packages/cpu-profiling/mocks/fixtures/
  • If no output file specified, adds .reduced.json to the input filename
  • Use --no-<option> to disable any boolean filter (e.g., --no-network, --no-animation)
  • Use --no-dur-min to disable minimum duration filtering
    `
    )

    .conflicts('include-phases', 'exclude-phases')
    .conflicts('include-pids', 'exclude-pids')
    .conflicts('include-tids', 'exclude-tids')
    .conflicts('include-names', 'exclude-names')
    .conflicts('include-cats', 'exclude-cats')

    .check((argv) => {
      // File validation
      const inputFile = argv.inputFile;
      if (inputFile) {
        if (!fileExists(inputFile as string)) {
          throw new Error(`Input file does not exist: ${inputFile}`);
        }
        if (!isJsonFile(inputFile as string)) {
          throw new Error(`Input file must be a JSON file: ${inputFile}`);
        }
      }

      // Output directory validation
      if (argv.output) {
        const outputDir = path.dirname(argv.output as string);
        if (outputDir !== '.' && !directoryExists(outputDir)) {
          throw new Error(`Output directory does not exist: ${outputDir}`);
        }
      }

      // Duration min/max relationship validation
      if (
        argv['dur-min'] !== undefined &&
        argv['dur-max'] !== undefined &&
        argv['dur-min'] > argv['dur-max']
      ) {
        throw new Error('--dur-min cannot be greater than --dur-max');
      }

      // Timestamp min/max relationship validation
      if (
        argv['ts-min'] !== undefined &&
        argv['ts-max'] !== undefined &&
        argv['ts-min'] > argv['ts-max']
      ) {
        throw new Error('--ts-min cannot be greater than --ts-max');
      }

      return true;
    });
}
