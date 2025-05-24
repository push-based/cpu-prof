export interface MergeArgs {
  _?: string[];
  inputFiles?: string[];
  output?: string;
  verbose?: boolean;
  pattern?: string;
  directory?: string;
  cpuProfiles?: boolean;
  inputDir?: string;
  outputDir?: string;
}

export interface ProcessedMergeArgs {
  inputFiles: string[];
  outputFile: string;
  verbose: boolean;
  isCpuProfileMode: boolean;
  inputDirectory?: string;
  outputDirectory?: string;
}
