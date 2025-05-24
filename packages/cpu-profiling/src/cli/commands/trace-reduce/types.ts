export interface ReduceTraceArgs {
  inputFile?: string;
  output?: string;
  verbose?: boolean;
  // Filter flags
  network?: boolean;
  animation?: boolean;
  gpu?: boolean;
  threadpool?: boolean;
  streamingcompile?: boolean;
  // Duration & timestamp filters
  'dur-min'?: number;
  'dur-max'?: number;
  'ts-min'?: number;
  'ts-max'?: number;
  // Advanced filtering
  'include-phases'?: string[];
  'exclude-phases'?: string[];
  'include-pids'?: number[];
  'exclude-pids'?: number[];
  'include-tids'?: number[];
  'exclude-tids'?: number[];
  'include-names'?: string[];
  'exclude-names'?: string[];
  'include-cats'?: string[];
  'exclude-cats'?: string[];
}

export interface ProcessedArgs {
  inputFile: string;
  outputFile: string;
  verbose: boolean;
  filterOptions: {
    filterNetwork: boolean;
    filterAnimation: boolean;
    filterGPU: boolean;
    filterThreadPool: boolean;
    filterStreamingCompile: boolean;
    durMin?: number;
    durMax?: number;
    tsMin?: number;
    tsMax?: number;
    includePhases?: string[];
    excludePhases?: string[];
    includePids?: number[];
    excludePids?: number[];
    includeTids?: number[];
    excludeTids?: number[];
    includeNames?: string[];
    excludeNames?: string[];
    includeCats?: string[];
    excludeCats?: string[];
  };
}

/**
 * @deprecated This interface is from the old CLI structure and should be phased out
 */
export interface ValidatedArgs {
  inputFile: string;
  outputFile: string;
  verbose: boolean;
  filterOptions: {
    filterNetwork: boolean;
    filterAnimation: boolean;
    filterGPU: boolean;
    filterThreadPool: boolean;
    filterStreamingCompile: boolean;
    durMin?: number;
    durMax?: number;
    tsMin?: number;
    tsMax?: number;
    includePhases?: string[];
    excludePhases?: string[];
    includePids?: number[];
    excludePids?: number[];
    includeTids?: number[];
    excludeTids?: number[];
    includeNames?: string[];
    excludeNames?: string[];
    includeCats?: string[];
    excludeCats?: string[];
  };
}
