// TypeScript definitions for Chrome DevTools Trace Event format

import { CPUProfile } from './cpu/cpuprofile.types';

export type TraceFile = TraceEvent[] | TraceEventContainer;

export interface TraceEventContainer {
  traceEvents: TraceEvent[];
  displayTimeUnit?: 'ms' | 'ns';
  systemTraceEvents?: string;
  metadata?: TraceMetadata;
  stackFrames?: Record<string, StackFrame>;
  samples?: Sample[];
  controllerTraceDataKey?: string;
  powerTraceAsString?: string;
}

/**
 * Top-level metadata for a trace, as found in `.cpuprofile` and DevTools exports.
 */
export interface TraceMetadata {
  source: string; // e.g. "DevTools"
  startTime: string; // ISO timestamp when trace recorded
  hardwareConcurrency?: number; // Number of logical processors
  dataOrigin?: string; // Origin of trace events, e.g. "TraceEvents"
  modifications?: Modifications; // Details of any UI or data modifications
  [key: string]: any; // Allow additional custom metadata
}

/**
 * Modifications made to trace data or UI in DevTools export
 */
export interface Modifications {
  entriesModifications: EntriesModifications;
  initialBreadcrumb: InitialBreadcrumb;
  annotations: Annotations;
}

/** Hidden or expandable entries information */
export interface EntriesModifications {
  hiddenEntries: any[]; // IDs or indexes of hidden entries
  expandableEntries: any[]; // IDs or indexes of expandable entries
}

/** Initial breadcrumb information for time ranges and window */
export interface InitialBreadcrumb {
  window: BreadcrumbWindow;
  child: any | null;
}

/** Time window bounds (min, max) in trace time units (e.g. microseconds) */
export interface BreadcrumbWindow {
  min: number;
  max: number;
  range: number;
}

/**
 * Custom label for a specific trace entry
 */
export interface EntryLabel {
  entryId: number | string; // ID or index of the trace entry
  label: string; // Label text for the entry
  color?: string; // Optional display color for the label
}

/**
 * A time range annotated with a label
 */
export interface LabelledTimeRange {
  startTime: number; // Start timestamp of the range (microseconds)
  endTime: number; // End timestamp of the range (microseconds)
  label: string; // Annotation label for the time range
  color?: string; // Optional display color for the range
}

/**
 * Link or relation between two trace entries
 */
export interface EntryLink {
  fromEntryId: number | string; // Source entry ID for the link
  toEntryId: number | string; // Target entry ID for the link
  linkType?: string; // Optional type or description of the link
}

/** Annotations such as labels and links between entries */
export interface Annotations {
  entryLabels: EntryLabel[]; // Custom labels for entries
  labelledTimeRanges: LabelledTimeRange[]; // Time ranges annotated with labels
  linksBetweenEntries: EntryLink[]; // Links or relations between entries
}

export type Phase =
  // Duration events (begin/end) and complete events:
  | 'B'
  | 'E'
  | 'X'
  // Instant events:
  | 'I'
  // Counter events:
  | 'C'
  // Async events (nestable):
  | 'b'
  | 'n'
  | 'e'
  // Flow events:
  | 's'
  | 't'
  | 'f'
  // Sample events:
  | 'P'
  // Object events:
  | 'N'
  | 'O'
  | 'D'
  // Metadata events:
  | 'M'
  // Memory dump events:
  | 'V'
  | 'v'
  // Mark events:
  | 'R'
  // Clock sync events:
  | 'c'
  // Context events:
  | '('
  | ')'
  // ID linking events:
  | '=';

/** Scope values for instant events (ph='i') */
export type InstantScope = 't' | 'p' | 'g';

/** Category string for trace events */
export type Category<T extends string = string> = `${
  | 'disabled-by-default-'
  | ''}${T}`;

export interface TraceEventBase {
  ph: Phase;
  name?: string;
  cat?: Category;
  pid?: number;
  tid?: number;
  ts: number;
  tts?: number;
  args?: Record<string, any>;
  dur?: number;
  tdur?: number;
  sf?: string | number;
  stack?: Array<string | number>;
  cname?: string;
}

/** Event identifier (for async, object, flow events, etc.) */
export type EventID = string | number;

export interface EventID2 {
  local?: string;
  global?: string;
}

export interface DurationBeginEvent extends TraceEventBase {
  ph: 'B';
  pid: number;
  tid: number;
}

export interface DurationEndEvent extends TraceEventBase {
  ph: 'E';
  pid: number;
  tid: number;
}

export interface CompleteEvent extends TraceEventBase {
  ph: 'X';
  pid: number;
  tid: number;
  name: string;
  dur: number;
  tdur?: number;
}

export interface InstantEvent extends TraceEventBase {
  ph: 'I';
  dur: 0;
  pid: number;
  tid: number;
  name: string;
  s?: InstantScope;
}

export interface CounterEvent extends TraceEventBase {
  ph: 'C';
  name: string;
  id?: EventID;
  args: Record<string, number>;
}

export interface AsyncBeginEvent extends TraceEventBase {
  ph: 'b';
  name: string;
  id?: EventID;
  id2?: EventID2;
  scope?: string;
}

export interface AsyncInstantEvent extends TraceEventBase {
  ph: 'n';
  name: string;
  id?: EventID;
  id2?: EventID2;
  scope?: string;
}

export interface AsyncEndEvent extends TraceEventBase {
  ph: 'e';
  name?: string;
  id?: EventID;
  id2?: EventID2;
  scope?: string;
}

export interface FlowStartEvent extends TraceEventBase {
  ph: 's';
  name: string;
  id?: EventID;
  id2?: EventID2;
}

export interface FlowStepEvent extends TraceEventBase {
  ph: 't';
  name: string;
  id?: EventID;
  id2?: EventID2;
}

export interface FlowEndEvent extends TraceEventBase {
  ph: 'f';
  name: string;
  id?: EventID;
}

export interface SampleEvent extends TraceEventBase {
  ph: 'P';
  name: string;
  id?: EventID;
}

/**
 * Frame information for TracingStartedInBrowserEvent
 */
export interface Frame {
  frame: string;
  isInPrimaryMainFrame: boolean;
  isOutermostMainFrame: boolean;
  name: string;
  processId: number;
  url: string;
}

/**
 * Event marking that tracing has started in the browser.
 */
export interface TracingStartedInBrowserEvent extends TraceEventBase {
  ph: 'I';
  cat: Category<'devtools.timeline'>;
  name: 'TracingStartedInBrowser';
  pid: number;
  tid: number;
  ts: number;
  s: InstantScope;
  args: {
    data: {
      frameTreeNodeId: number;
      frames: Frame[];
      persistentIds: true;
    };
  };
}

export interface CpuProfilerStartProfilingEvent extends TraceEventBase {
  cat: Category<'v8'>;
  ph: 'X';
  pid: number;
  tid: number;
  name: 'CpuProfiler::StartProfiling';
  ts: number;
}

export interface CpuProfilerStopProfilingEvent extends TraceEventBase {
  cat: Category<'v8'>;
  ph: 'X';
  pid: number;
  tid: number;
  name: 'CpuProfiler::StopProfiling';
  ts: number;
}

export interface ProfileEvent extends SampleEvent {
  cat: Category<'v8.cpu_profiler'>;
  name: 'Profile';
  args: { data: { startTime: number; [key: string]: any } };
}

export interface ProfileChunkEvent extends SampleEvent {
  cat: Category<'v8.cpu_profiler'>;
  name: 'ProfileChunk';
  args: {
    data: {
      cpuProfile: Omit<CPUProfile, 'timeDeltas' | 'startTime' | 'endTime'>;
      timeDeltas?: number[];
      [key: string]: any;
    };
  };
}

export interface ObjectCreatedEvent extends TraceEventBase {
  ph: 'N';
  name: string;
  id: EventID;
}

export interface ObjectSnapshotEvent extends TraceEventBase {
  ph: 'O';
  name: string;
  id: EventID;
  args: { snapshot: any };
}

export interface ObjectDestroyedEvent extends TraceEventBase {
  ph: 'D';
  name: string;
  id: EventID;
}

interface MetadataEventBase extends TraceEventBase {
  ph: 'M';
  cat: '__metadata';
  pid: number;
  tid: number;
}

export interface ProcessNameEvent extends MetadataEventBase {
  name: 'process_name';
  args: { name: string };
}

export interface ThreadNameEvent extends MetadataEventBase {
  name: 'thread_name';
  args: { name: string };
}

export interface GlobalMemoryDumpEvent extends TraceEventBase {
  ph: 'V';
  id: EventID;
  args: Record<string, any>;
}

export interface ProcessMemoryDumpEvent extends TraceEventBase {
  ph: 'v';
  pid: number;
  id: EventID;
  args: Record<string, any>;
}

export interface MarkEvent extends TraceEventBase {
  ph: 'R';
  name: string;
}

export interface ClockSyncEvent extends TraceEventBase {
  ph: 'c';
  name: 'clock_sync';
  args: { sync_id: string; issue_ts?: number };
}

export interface ContextEnterEvent extends TraceEventBase {
  ph: '(';
  name: string;
  id: EventID;
}

export interface ContextLeaveEvent extends TraceEventBase {
  ph: ')';
  name: string;
  id: EventID;
}

export interface IDLinkEvent extends TraceEventBase {
  ph: '=';
  name?: string;
  id: EventID;
  args: { linked_id: EventID };
}

export interface ProcessLabelsEvent extends MetadataEventBase {
  name: 'process_labels';
  args: { labels: string };
}

export interface ProcessSortIndexEvent extends MetadataEventBase {
  name: 'process_sort_index';
  args: { sort_index: number };
}

export interface ThreadSortIndexEvent extends MetadataEventBase {
  name: 'thread_sort_index';
  args: { sort_index: number };
}

export type TraceEvent =
  | DurationBeginEvent
  | DurationEndEvent
  | CompleteEvent
  | InstantEvent
  | CounterEvent
  | AsyncBeginEvent
  | AsyncInstantEvent
  | AsyncEndEvent
  | FlowStartEvent
  | FlowStepEvent
  | FlowEndEvent
  | SampleEvent
  | TracingStartedInBrowserEvent
  | CpuProfilerStartProfilingEvent
  | CpuProfilerStopProfilingEvent
  | ProfileEvent
  | ProfileChunkEvent
  | ObjectCreatedEvent
  | ObjectSnapshotEvent
  | ObjectDestroyedEvent
  | ProcessNameEvent
  | ProcessLabelsEvent
  | ProcessSortIndexEvent
  | ThreadNameEvent
  | ThreadSortIndexEvent
  | GlobalMemoryDumpEvent
  | ProcessMemoryDumpEvent
  | MarkEvent
  | ClockSyncEvent
  | ContextEnterEvent
  | ContextLeaveEvent
  | IDLinkEvent;

export interface StackFrame {
  name?: string;
  category?: string;
  file?: string;
  line?: number;
  column?: number;
  parent?: string;
}

export interface Sample {
  cpu?: number;
  name: string;
  ts: number;
  pid: number;
  tid: number;
  weight?: number;
  sf?: string;
  stack?: string[];
}
