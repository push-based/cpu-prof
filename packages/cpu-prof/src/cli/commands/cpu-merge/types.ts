export interface MergeArgs {
  _?: string[];
  inputDir?: string;
  outputDir?: string;
  verbose?: boolean;
  smosh?: 'pid' | 'tid' | 'all';
  startTracingInBrowser?: boolean;
}

export interface ProcessedMergeArgs {
  inputDir: string;
  outputDir: string;
  verbose: boolean;
  smosh: 'pid' | 'tid' | 'all' | undefined;
  startTracingInBrowser: boolean;
}
