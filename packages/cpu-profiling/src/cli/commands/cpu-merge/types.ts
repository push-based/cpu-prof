export interface MergeArgs {
  _?: string[];
  inputDir?: string;
  outputDir?: string;
  verbose?: boolean;
  smosh?: 'pid' | 'tid' | boolean;
}

export interface ProcessedMergeArgs {
  inputDir: string;
  outputDir: string;
  verbose: boolean;
  smosh: 'pid' | 'tid' | boolean;
}
