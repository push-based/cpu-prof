
export interface CallFrame {
    functionName?: string;
    scriptId: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
}

export interface CpuProfileNode {
    id: number;
    callFrame: CallFrame;
    children?: number[];
    hitCount?: number;
}


/**
 * V8 CPUProfile object as defined by the Chrome DevTools Protocol.
 * Contains the entire call tree and sample timings.
 */
export interface CpuProfile {
    /** Array of all profile nodes (call frames) */
    nodes: CpuProfileNode[];
    /** Array of sampled node IDs (one per sample) */
    samples: number[];
    /** Intervals (μs) between successive samples */
    timeDeltas: number[];
    /** Optional: wall-clock start timestamp (μs) */
    startTime?: number;
    /** Optional: wall-clock end timestamp (μs) */
    endTime?: number;
}

/**
 * Container object maintaining V8 CPUProfile as well as metadata.
 */
export interface CpuProfileInfo {
    pid: number;
    tid: number;
    cpuProfile: CpuProfile;
    sequence?: number;
    startDate?: Date;
    sourceFilePath?: string;
    execArgs?: string[];
}
