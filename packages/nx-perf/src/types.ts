import { Performance as NodePerformance } from 'node:perf_hooks';
import { TraceEvent, TraceFile } from '@push-based/prof-dev-kit';

export type PerformanceEntryOptions = {
  detail?: Record<string, unknown>;
};

export type NxPerfOptions = {
  verbose?: boolean;
  noPatch?: boolean;
  onData?: (data: string) => void;
  onTraceEvent?: (event: TraceEvent) => void;
  onMetadata?: (metadata: Record<string, unknown>) => void;
  beforeExit?: (profile: TraceFile) => void;
};

export type CallFrame = {
  functionName: string | null;
  file: string;
  line: number;
  column: number;
  raw?: string;
};

export type PerformanceMarkOptions = {
  detail?: {
    callStack?: CallFrame[];
    [key: string]: unknown;
  };
} & PerformanceEntryOptions;

declare global {
  interface Performance extends NodePerformance {
    profile(): {
      metadata: Record<string, unknown>;
      traceEvents: TraceEvent[];
    };
  }
}
