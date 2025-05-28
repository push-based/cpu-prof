import type { Argv } from 'yargs';
import { DEFAULT_FILTER_OPTIONS } from '../../../lib/reduce-trace';
import type { ReduceTraceArgs } from './types';
import {
  coerceStringArray,
  coerceNumberArray,
  coerceStringArrayWithDefaults,
} from '../../../lib/cpu/utils';
import { validateTraceReduceArgs } from './helpers';
import { findNewestTraceFile, generateOutputFilename } from '../../utils';

// Constants for default values to reduce duplication
const DEFAULT_DUR_MIN = DEFAULT_FILTER_OPTIONS.durMin;
const DEFAULT_EXCLUDE_NAMES =
  DEFAULT_FILTER_OPTIONS.excludeNames?.join(', ') ?? '';
const DEFAULT_EXCLUDE_CATS =
  DEFAULT_FILTER_OPTIONS.excludeCats?.join(', ') ?? '';
const DEFAULT_EXCLUDE_NAMES_COMMA =
  DEFAULT_FILTER_OPTIONS.excludeNames?.join(',') ?? '';
const DEFAULT_EXCLUDE_CATS_COMMA =
  DEFAULT_FILTER_OPTIONS.excludeCats?.join(',') ?? '';

/**
 * Add basic options (output, verbose)
 */
function addBasicOptions(yargs: Argv<ReduceTraceArgs>): Argv<ReduceTraceArgs> {
  return yargs
    .group(['help', 'version', 'verbose', 'output'], 'Basic Options:')
    .options({
      output: {
        alias: 'o',
        describe: 'Output file path',
        type: 'string',
        normalize: true,
      },
      verbose: {
        alias: 'v',
        describe: 'Enable verbose logging',
        type: 'boolean',
        default: false,
      },
    });
}

/**
 * Add event type filtering options
 */
function addEventTypeFilters(
  yargs: Argv<ReduceTraceArgs>
): Argv<ReduceTraceArgs> {
  return yargs
    .group(
      ['network', 'animation', 'gpu', 'threadpool', 'streamingcompile'],
      'Event Type Filtering:'
    )
    .options({
      network: {
        describe: 'Enable network event filtering',
        type: 'boolean',
        default: true,
      },
      animation: {
        describe: 'Enable animation event filtering',
        type: 'boolean',
        default: true,
      },
      gpu: {
        describe: 'Enable GPU event filtering',
        type: 'boolean',
        default: true,
      },
      threadpool: {
        describe: 'Enable ThreadPool event filtering',
        type: 'boolean',
        default: true,
      },
      streamingcompile: {
        describe: 'Enable StreamingCompile event filtering',
        type: 'boolean',
        default: true,
      },
    });
}

/**
 * Add advanced filtering options (phases, PIDs, TIDs)
 */
function addAdvancedFiltering(
  yargs: Argv<ReduceTraceArgs>
): Argv<ReduceTraceArgs> {
  return yargs
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
    .options({
      'include-phases': {
        describe:
          'Comma-separated list of event phases to include (e.g., B,E,X)',
        type: 'array',
        coerce: coerceStringArray,
      },
      'exclude-phases': {
        describe: 'Comma-separated list of event phases to exclude (e.g., M,I)',
        type: 'array',
        coerce: coerceStringArray,
      },
      'include-pids': {
        describe: 'Comma-separated list of Process IDs to include',
        type: 'array',
        coerce: (arg) => coerceNumberArray(arg, 'PID'),
      },
      'exclude-pids': {
        describe: 'Comma-separated list of Process IDs to exclude',
        type: 'array',
        coerce: (arg) => coerceNumberArray(arg, 'PID'),
      },
      'include-tids': {
        describe: 'Comma-separated list of Thread IDs to include',
        type: 'array',
        coerce: (arg) => coerceNumberArray(arg, 'TID'),
      },
      'exclude-tids': {
        describe: 'Comma-separated list of Thread IDs to exclude',
        type: 'array',
        coerce: (arg) => coerceNumberArray(arg, 'TID'),
      },
    });
}

/**
 * Add name and category filtering options
 */
function addNameCatFiltering(
  yargs: Argv<ReduceTraceArgs>
): Argv<ReduceTraceArgs> {
  return yargs
    .group(
      ['include-names', 'exclude-names', 'include-cats', 'exclude-cats'],
      'Name & Category Filtering:'
    )
    .options({
      'include-names': {
        describe: 'Comma-separated list of event names to include',
        type: 'array',
        coerce: coerceStringArray,
      },
      'exclude-names': {
        describe: `Comma-separated list of event names to exclude (default: ${DEFAULT_EXCLUDE_NAMES_COMMA})`,
        type: 'array',
        default: DEFAULT_FILTER_OPTIONS.excludeNames,
        coerce: (arg) =>
          coerceStringArrayWithDefaults(
            arg,
            DEFAULT_FILTER_OPTIONS.excludeNames
          ),
      },
      'include-cats': {
        describe: 'Comma-separated list of event categories to include',
        type: 'array',
        coerce: coerceStringArray,
      },
      'exclude-cats': {
        describe: `Comma-separated list of event categories to exclude (default: ${DEFAULT_EXCLUDE_CATS_COMMA})`,
        type: 'array',
        default: DEFAULT_FILTER_OPTIONS.excludeCats,
        coerce: (arg) =>
          coerceStringArrayWithDefaults(
            arg,
            DEFAULT_FILTER_OPTIONS.excludeCats
          ),
      },
    });
}

/**
 * Add duration and timestamp filtering options
 */
function addDurationTimestampFiltering(
  yargs: Argv<ReduceTraceArgs>
): Argv<ReduceTraceArgs> {
  return yargs
    .group(
      ['dur-min', 'dur-max', 'ts-min', 'ts-max'],
      'Duration & Timestamp Filtering:'
    )
    .options({
      'dur-min': {
        describe: `Filter out events shorter than specified duration in microseconds (default: ${DEFAULT_DUR_MIN}μs)`,
        type: 'number',
        default: DEFAULT_FILTER_OPTIONS.durMin,
      },
      'dur-max': {
        describe:
          'Filter out events longer than specified duration in microseconds',
        type: 'number',
      },
      'ts-min': {
        describe:
          'Filter out events with timestamp earlier than specified in microseconds',
        type: 'number',
      },
      'ts-max': {
        describe:
          'Filter out events with timestamp later than specified in microseconds',
        type: 'number',
      },
    });
}

/**
 * Build the yargs command configuration for reduce-trace
 */
export function builder(yargs: Argv): Argv<ReduceTraceArgs> {
  return [
    addBasicOptions,
    addEventTypeFilters,
    addAdvancedFiltering,
    addNameCatFiltering,
    addDurationTimestampFiltering,
  ]
    .reduce((acc, fn) => fn(acc), yargs)
    .positional('inputFile', {
      describe: 'Path to the input trace file (JSON format)',
      type: 'string',
      normalize: true,
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
  • Minimum duration filtering: ${DEFAULT_DUR_MIN}μs
  • Default excluded names: ${DEFAULT_EXCLUDE_NAMES}
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
    .middleware((argv) => {
      // Handle input file (auto-select if not provided)
      if (!argv.inputFile) {
        argv.inputFile = findNewestTraceFile();
      }

      // Handle output file (auto-generate if not provided)
      if (!argv.output) {
        argv.output = generateOutputFilename(argv.inputFile);
      }
    })
    .check(validateTraceReduceArgs);
}
