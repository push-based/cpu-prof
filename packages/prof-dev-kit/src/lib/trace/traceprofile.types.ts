// TypeScript definitions for Chrome DevTools Trace Event format

import { CPUProfile } from '../cpu/cpuprofile.types';

export type TraceFile = TraceEvent[] | TraceEventContainer;

export type TraceEventContainer = {
  traceEvents: TraceEvent[];
  displayTimeUnit?: 'ms' | 'ns';
  systemTraceEvents?: string;
  metadata?: TraceMetadata;
  stackFrames?: Record<string, StackFrame>;
  samples?: Sample[];
  controllerTraceDataKey?: string;
  powerTraceAsString?: string;
};

/**
 * Top-level metadata for a trace, as found in `.cpuprofile` and DevTools exports.
 */
export type TraceMetadata = {
  source: string; // e.g. "DevTools"
  startTime: string; // ISO timestamp when trace recorded
  hardwareConcurrency?: number; // Number of logical processors
  dataOrigin?: string; // Origin of trace events, e.g. "TraceEvents"
  modifications?: Modifications; // Details of unknown UI or data modifications
  [key: string]: unknown; // Allow additional custom metadata
};

/**
 * Modifications made to trace data or UI in DevTools export
 */
export type Modifications = {
  entriesModifications: EntriesModifications;
  initialBreadcrumb: InitialBreadcrumb;
  annotations: Annotations;
};

/** Hidden or expandable entries information */
export type EntriesModifications = {
  hiddenEntries: unknown[]; // IDs or indexes of hidden entries
  expandableEntries: unknown[]; // IDs or indexes of expandable entries
};

/** Initial breadcrumb information for time ranges and window */
export type InitialBreadcrumb = {
  window: BreadcrumbWindow;
  child: unknown | null;
};

/** Time window bounds (min, max) in trace time units (e.g. microseconds) */
export type BreadcrumbWindow = {
  min: number;
  max: number;
  range: number;
};

/**
 * Custom label for a specific trace entry
 */
export type EntryLabel = {
  entryId: number | string; // ID or index of the trace entry
  label: string; // Label text for the entry
  color?: string; // Optional display color for the label
};

/**
 * A time range annotated with a label
 */
export type LabelledTimeRange = {
  startTime: number; // Start timestamp of the range (microseconds)
  endTime: number; // End timestamp of the range (microseconds)
  label: string; // Annotation label for the time range
  color?: string; // Optional display color for the range
};

/**
 * Link or relation between two trace entries
 */
export type EntryLink = {
  fromEntryId: number | string; // Source entry ID for the link
  toEntryId: number | string; // Target entry ID for the link
  linkType?: string; // Optional type or description of the link
};

/** Annotations such as labels and links between entries */
export type Annotations = {
  entryLabels: EntryLabel[]; // Custom labels for entries
  labelledTimeRanges: LabelledTimeRange[]; // Time ranges annotated with labels
  linksBetweenEntries: EntryLink[]; // Links or relations between entries
};

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

export type TraceEventBase = {
  ph: Phase;
  name?: string;
  cat?: Category;
  pid?: number;
  tid?: number;
  ts: number;
  tts?: number;
  args?: Record<string, unknown>;
  dur?: number;
  tdur?: number;
  sf?: string | number;
  stack?: (string | number)[];
  cname?: string;
};

/** Event identifier (for async, object, flow events, etc.) */
export type EventID = string | number;

export type EventID2 = {
  local?: string;
  global?: string;
};

export type DurationBeginEvent = {
  ph: 'B';
  pid: number;
  tid: number;
} & TraceEventBase;

export type DurationEndEvent = {
  ph: 'E';
  pid: number;
  tid: number;
} & TraceEventBase;

export type CompleteEvent = {
  ph: 'X';
  pid: number;
  tid: number;
  name: string;
  dur: number;
  tdur?: number;
} & TraceEventBase;

export type InstantEvent = {
  ph: 'I';
  dur: 0;
  pid: number;
  tid: number;
  name: string;
  s?: InstantScope;
} & TraceEventBase;

export type CounterEvent = {
  ph: 'C';
  name: string;
  id?: EventID;
  args: Record<string, number>;
} & TraceEventBase;

export type AsyncBeginEvent = {
  ph: 'b';
  name: string;
  id?: EventID;
  id2?: EventID2;
  scope?: string;
} & TraceEventBase;

export type AsyncInstantEvent = {
  ph: 'n';
  name: string;
  id?: EventID;
  id2?: EventID2;
  scope?: string;
} & TraceEventBase;

export type AsyncEndEvent = {
  ph: 'e';
  name?: string;
  id?: EventID;
  id2?: EventID2;
  scope?: string;
} & TraceEventBase;

export type FlowStartEvent = {
  ph: 's';
  name: string;
  id?: EventID;
  id2?: EventID2;
} & TraceEventBase;

export type FlowStepEvent = {
  ph: 't';
  name: string;
  id?: EventID;
  id2?: EventID2;
} & TraceEventBase;

export type FlowEndEvent = {
  ph: 'f';
  name: string;
  id?: EventID;
} & TraceEventBase;

export type SampleEvent = {
  ph: 'P';
  name: string;
  id?: EventID;
} & TraceEventBase;

/**
 * Frame information for TracingStartedInBrowserEvent
 */
export type Frame = {
  frame: string;
  isInPrimaryMainFrame: boolean;
  isOutermostMainFrame: boolean;
  name: string;
  processId: number;
  url: string;
};

/**
 * Event marking that tracing has started in the browser.
 */
export type TracingStartedInBrowserEvent = {
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
} & TraceEventBase;

export type CpuProfilerStartProfilingEvent = {
  cat: Category<'v8'>;
  ph: 'X';
  pid: number;
  tid: number;
  name: 'CpuProfiler::StartProfiling';
  ts: number;
} & TraceEventBase;

export type CpuProfilerStopProfilingEvent = {
  cat: Category<'v8'>;
  ph: 'X';
  pid: number;
  tid: number;
  name: 'CpuProfiler::StopProfiling';
  ts: number;
} & TraceEventBase;

export type ProfileEvent = {
  cat: Category<'v8.cpu_profiler'>;
  name: 'Profile';
  args: { data: { startTime: number; [key: string]: unknown } };
} & SampleEvent;

export type ProfileChunkEvent = {
  cat: Category<'v8.cpu_profiler'>;
  name: 'ProfileChunk';
  args: {
    data: {
      cpuProfile: Omit<CPUProfile, 'timeDeltas' | 'startTime' | 'endTime'>;
      timeDeltas?: number[];
      [key: string]: unknown;
    };
  };
} & SampleEvent;

export type ObjectCreatedEvent = {
  ph: 'N';
  name: string;
  id: EventID;
} & TraceEventBase;

export type ObjectSnapshotEvent = {
  ph: 'O';
  name: string;
  id: EventID;
  args: { snapshot: unknown };
} & TraceEventBase;

export type ObjectDestroyedEvent = {
  ph: 'D';
  name: string;
  id: EventID;
} & TraceEventBase;

type MetadataEventBase = {
  ph: 'M';
  cat: '__metadata';
  pid: number;
  tid: number;
} & TraceEventBase;

export type ProcessNameEvent = {
  name: 'process_name';
  args: { name: string };
} & MetadataEventBase;

export type ThreadNameEvent = {
  name: 'thread_name';
  args: { name: string };
} & MetadataEventBase;

export type GlobalMemoryDumpEvent = {
  ph: 'V';
  id: EventID;
  args: Record<string, unknown>;
} & TraceEventBase;

export type ProcessMemoryDumpEvent = {
  ph: 'v';
  pid: number;
  id: EventID;
  args: Record<string, unknown>;
} & TraceEventBase;

export type MarkEvent = {
  ph: 'R';
  name: string;
} & TraceEventBase;

export type ClockSyncEvent = {
  ph: 'c';
  name: 'clock_sync';
  args: { sync_id: string; issue_ts?: number };
} & TraceEventBase;

export type ContextEnterEvent = {
  ph: '(';
  name: string;
  id: EventID;
} & TraceEventBase;

export type ContextLeaveEvent = {
  ph: ')';
  name: string;
  id: EventID;
} & TraceEventBase;

export type IDLinkEvent = {
  ph: '=';
  name?: string;
  id: EventID;
  args: { linked_id: EventID };
} & TraceEventBase;

export type ProcessLabelsEvent = {
  name: 'process_labels';
  args: { labels: string };
} & MetadataEventBase;

export type ProcessSortIndexEvent = {
  name: 'process_sort_index';
  args: { sort_index: number };
} & MetadataEventBase;

export type ThreadSortIndexEvent = {
  name: 'thread_sort_index';
  args: { sort_index: number };
} & MetadataEventBase;

/**
 * Copy of: https://developer.chrome.com/docs/devtools/performance/extension?hl=de
 * */

export type DevToolsColor =
  | 'primary'
  | 'primary-light'
  | 'primary-dark'
  | 'secondary'
  | 'secondary-light'
  | 'secondary-dark'
  | 'tertiary'
  | 'tertiary-light'
  | 'tertiary-dark'
  | 'error';

export type ExtensionTrackEntryPayload = {
  dataType?: 'track-entry'; // Defaults to "track-entry"
  color?: DevToolsColor; // Defaults to "primary"
  track: string; // Required: Name of the custom track
  trackGroup?: string; // Optional: Group for organizing tracks
  properties?: [string, string][]; // Key-value pairs for detailed view
  tooltipText?: string; // Short description for tooltip
};

export type ExtensionMarkerPayload = {
  dataType: 'marker'; // Required: Identifies as a marker
  color?: DevToolsColor; // Defaults to "primary"
  properties?: [string, string][]; // Key-value pairs for detailed view
  tooltipText?: string; // Short description for tooltip
};

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

export type StackFrame = {
  name?: string;
  category?: string;
  file?: string;
  line?: number;
  column?: number;
  parent?: string;
};

export type Sample = {
  cpu?: number;
  name: string;
  ts: number;
  pid: number;
  tid: number;
  weight?: number;
  sf?: string;
  stack?: string[];
};
