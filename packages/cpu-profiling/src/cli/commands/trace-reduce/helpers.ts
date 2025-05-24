import type { ProcessedArgs } from './types';

/**
 * Log verbose options when verbose mode is enabled
 */
export function logVerboseOptions(args: ProcessedArgs): void {
  console.log('🔧 Filter Options:');
  console.log(
    `  Network filtering: ${
      args.filterOptions.filterNetwork ? 'enabled' : 'disabled'
    }`
  );
  console.log(
    `  Animation filtering: ${
      args.filterOptions.filterAnimation ? 'enabled' : 'disabled'
    }`
  );
  console.log(
    `  GPU filtering: ${args.filterOptions.filterGPU ? 'enabled' : 'disabled'}`
  );
  console.log(
    `  ThreadPool filtering: ${
      args.filterOptions.filterThreadPool ? 'enabled' : 'disabled'
    }`
  );
  console.log(
    `  StreamingCompile filtering: ${
      args.filterOptions.filterStreamingCompile ? 'enabled' : 'disabled'
    }`
  );

  if (args.filterOptions.durMin !== undefined) {
    console.log(`  Minimum duration: ${args.filterOptions.durMin}μs`);
  }
  if (args.filterOptions.durMax !== undefined) {
    console.log(`  Maximum duration: ${args.filterOptions.durMax}μs`);
  }
  if (args.filterOptions.tsMin !== undefined) {
    console.log(`  Minimum timestamp: ${args.filterOptions.tsMin}`);
  }
  if (args.filterOptions.tsMax !== undefined) {
    console.log(`  Maximum timestamp: ${args.filterOptions.tsMax}`);
  }
  if (args.filterOptions.includePhases) {
    console.log(
      `  Include phases: ${args.filterOptions.includePhases.join(', ')}`
    );
  }
  if (args.filterOptions.excludePhases) {
    console.log(
      `  Exclude phases: ${args.filterOptions.excludePhases.join(', ')}`
    );
  }
  if (args.filterOptions.includePids) {
    console.log(`  Include PIDs: ${args.filterOptions.includePids.join(', ')}`);
  }
  if (args.filterOptions.excludePids) {
    console.log(`  Exclude PIDs: ${args.filterOptions.excludePids.join(', ')}`);
  }
  if (args.filterOptions.includeTids) {
    console.log(`  Include TIDs: ${args.filterOptions.includeTids.join(', ')}`);
  }
  if (args.filterOptions.excludeTids) {
    console.log(`  Exclude TIDs: ${args.filterOptions.excludeTids.join(', ')}`);
  }
  if (args.filterOptions.includeNames) {
    console.log(
      `  Include names: ${args.filterOptions.includeNames.join(', ')}`
    );
  }
  if (args.filterOptions.excludeNames) {
    console.log(
      `  Exclude names: ${args.filterOptions.excludeNames.join(', ')}`
    );
  }
  if (args.filterOptions.includeCats) {
    console.log(
      `  Include categories: ${args.filterOptions.includeCats.join(', ')}`
    );
  }
  if (args.filterOptions.excludeCats) {
    console.log(
      `  Exclude categories: ${args.filterOptions.excludeCats.join(', ')}`
    );
  }

  console.log(`📁 Input file: ${args.inputFile}`);
  console.log(`📁 Output file: ${args.outputFile}`);
}
