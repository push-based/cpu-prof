import { Performance as NodePerformance } from 'node:perf_hooks';

export type PerformanceEntryOptions = {
  detail?: Record<string, unknown>;
};

export type TraceEvent = {
  name: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  args?: Record<string, unknown>;
  dur?: number;
  cat?: string;
};

export type PerfProfileEvent = {
  name: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  args?: Record<string, unknown>;
  dur?: number;
  cat?: string;
};

export type Profile = {
  metadata: Record<string, unknown>;
  traceEvents: PerfProfileEvent[];
};

export type NxPerfOptions = {
  verbose?: boolean;
  noPatch?: boolean;
  onData?: (data: string) => void;
  onTraceEvent?: (event: PerfProfileEvent) => void;
  onMetadata?: (metadata: Record<string, unknown>) => void;
  beforeExit?: (profile: Profile) => void;
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
