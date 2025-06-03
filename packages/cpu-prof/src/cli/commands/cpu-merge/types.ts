export interface MergeArgs {
  _?: string[];
  inputDir?: string;
  outputDir?: string;
  verbose?: boolean;
  smosh?: boolean;
  startTracingInBrowser?: boolean;
  focusMain?: boolean;
}

export interface ProcessedMergeArgs {
  inputDir: string;
  outputDir: string;
  verbose: boolean;
  smosh: boolean;
  startTracingInBrowser: boolean;
}
