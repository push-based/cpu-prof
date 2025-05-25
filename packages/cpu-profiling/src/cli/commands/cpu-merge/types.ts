export interface MergeArgs {
  _?: string[];
  inputDir?: string;
  outputDir?: string;
  verbose?: boolean;
}

export interface ProcessedMergeArgs {
  inputDir: string;
  outputDir: string;
  verbose: boolean;
}
