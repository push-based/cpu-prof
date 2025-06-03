import type { ProcessedArgs } from './types';
import type { TraceReductionStats } from '../../../lib/reduce-trace';
import path from 'path';
import {
  fileExists,
  isJsonFile,
  directoryExists,
} from '../../../lib/file-utils';

/**
 * Log verbose options when verbose mode is enabled
 */
export function logVerboseOptions(args: ProcessedArgs, logger = console): void {
  logger.log('🔧 Filter Options:');
  logger.log(
    `  Network filtering: ${
      args.filterOptions.filterNetwork ? 'enabled' : 'disabled'
    }`
  );
  logger.log(
    `  Animation filtering: ${
      args.filterOptions.filterAnimation ? 'enabled' : 'disabled'
    }`
  );
  logger.log(
    `  GPU filtering: ${args.filterOptions.filterGPU ? 'enabled' : 'disabled'}`
  );
  logger.log(
    `  ThreadPool filtering: ${
      args.filterOptions.filterThreadPool ? 'enabled' : 'disabled'
    }`
  );
  logger.log(
    `  StreamingCompile filtering: ${
      args.filterOptions.filterStreamingCompile ? 'enabled' : 'disabled'
    }`
  );

  if (args.filterOptions.durMin !== undefined) {
    logger.log(`  Minimum duration: ${args.filterOptions.durMin}μs`);
  }
  if (args.filterOptions.durMax !== undefined) {
    logger.log(`  Maximum duration: ${args.filterOptions.durMax}μs`);
  }
  if (args.filterOptions.tsMin !== undefined) {
    logger.log(`  Minimum timestamp: ${args.filterOptions.tsMin}`);
  }
  if (args.filterOptions.tsMax !== undefined) {
    logger.log(`  Maximum timestamp: ${args.filterOptions.tsMax}`);
  }
  if (args.filterOptions.includePhases) {
    logger.log(
      `  Include phases: ${args.filterOptions.includePhases.join(', ')}`
    );
  }
  if (args.filterOptions.excludePhases) {
    logger.log(
      `  Exclude phases: ${args.filterOptions.excludePhases.join(', ')}`
    );
  }
  if (args.filterOptions.includePids) {
    logger.log(`  Include PIDs: ${args.filterOptions.includePids.join(', ')}`);
  }
  if (args.filterOptions.excludePids) {
    logger.log(`  Exclude PIDs: ${args.filterOptions.excludePids.join(', ')}`);
  }
  if (args.filterOptions.includeTids) {
    logger.log(`  Include TIDs: ${args.filterOptions.includeTids.join(', ')}`);
  }
  if (args.filterOptions.excludeTids) {
    logger.log(`  Exclude TIDs: ${args.filterOptions.excludeTids.join(', ')}`);
  }
  if (args.filterOptions.includeNames) {
    logger.log(
      `  Include names: ${args.filterOptions.includeNames.join(', ')}`
    );
  }
  if (args.filterOptions.excludeNames) {
    logger.log(
      `  Exclude names: ${args.filterOptions.excludeNames.join(', ')}`
    );
  }
  if (args.filterOptions.includeCats) {
    logger.log(
      `  Include categories: ${args.filterOptions.includeCats.join(', ')}`
    );
  }
  if (args.filterOptions.excludeCats) {
    logger.log(
      `  Exclude categories: ${args.filterOptions.excludeCats.join(', ')}`
    );
  }

  logger.log(`📁 Input file: ${args.inputFile}`);
  logger.log(`📁 Output file: ${args.outputFile}`);
}

/**
 * Validate command line arguments for trace-reduce command
 */
export function validateTraceReduceArgs(argv: any): boolean {
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
}

/**
 * Format trace reduction statistics for display
 */
export interface FormattedStats {
  originalFileMB: string;
  originalEventCount: number;
  cleanedFileMB: string;
  filteredEventCount: number;
  removedEventCount: number;
  reductionRatio: string;
  inputFile: string;
  outputFile: string;
}

export function getStats(result: TraceReductionStats): FormattedStats {
  return {
    originalFileMB: (result.originalSize / (1024 * 1024)).toFixed(2),
    originalEventCount: result.originalEventCount,
    cleanedFileMB: (result.cleanedSize / (1024 * 1024)).toFixed(2),
    filteredEventCount: result.filteredEventCount,
    removedEventCount: result.removedEventCount,
    reductionRatio: (
      (result.removedEventCount / result.originalEventCount) *
      100
    ).toFixed(1),
    inputFile: result.inputFile,
    outputFile: result.outputFile,
  };
}

/**
 * Log trace reduction statistics to console
 */
export function logStats(stats: FormattedStats, logger = console): void {
  logger.log(
    `📊 Original file: ${stats.originalFileMB} MB, ${stats.originalEventCount} events`
  );
  logger.log(
    `📊 Cleaned file: ${stats.cleanedFileMB} MB, ${stats.filteredEventCount} events`
  );
  logger.log(`📊 Events removed: ${stats.removedEventCount}`);
  logger.log(`📊 Reduction ratio: ${stats.reductionRatio}%`);
  logger.log(`✅ Reduced trace file created: ${stats.outputFile}`);
  logger.log(`✅ Original file preserved: ${stats.inputFile}`);
}
