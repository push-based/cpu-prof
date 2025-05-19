import { Performance as NodePerformance } from 'node:perf_hooks';

export interface PerformanceEntryOptions {
  detail?: Record<string, unknown>;
}

export interface TraceEvent {
  name: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  args?: Record<string, unknown>;
  dur?: number;
  cat?: string;
}

export interface PerfProfileEvent {
  name: string;
  ph: string;
  pid: number;
  tid: number;
  ts: number;
  args?: Record<string, unknown>;
  dur?: number;
  cat?: string;
}

export interface Profile {
  metadata: Record<string, unknown>;
  traceEvents: PerfProfileEvent[];
}

export interface NxPerfOptions {
  verbose?: boolean;
  noPatch?: boolean;
  onData?: (data: string) => void;
  onTraceEvent?: (event: PerfProfileEvent) => void;
  onMetadata?: (metadata: Record<string, unknown>) => void;
  beforeExit?: (profile: Profile) => void;
}

export interface CallFrame {
  functionName: string | null;
  file: string;
  line: number;
  column: number;
  raw?: string;
}

export interface PerformanceMarkOptions extends PerformanceEntryOptions {
  detail?: {
    callStack?: CallFrame[];
    [key: string]: unknown;
  };
}

declare global {
  interface Performance extends NodePerformance {
    profile(): {
      metadata: Record<string, unknown>;
      traceEvents: TraceEvent[];
    };
  }
}
