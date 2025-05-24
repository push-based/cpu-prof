import { TraceEvent, TraceFile } from './traceprofile.types';
import * as fs from 'fs';

/**
 * Default filter options used throughout the application
 */
export const DEFAULT_FILTER_OPTIONS: Partial<FilterOptions> = {
  filterNetwork: true,
  filterAnimation: true,
  filterGPU: true,
  filterThreadPool: true,
  filterStreamingCompile: true,
  excludeNames: ['ResourceReceivedData', 'UpdateCounters', 'v8.evaluateModule'],
  excludeCats: ['v8.compile'],
  durMin: 10000, // 10μs minimum duration
};

/**
 * Options for filtering trace events
 */
export interface FilterOptions {
  filterNetwork?: boolean;
  filterAnimation?: boolean;
  filterGPU?: boolean;
  filterThreadPool?: boolean;
  filterStreamingCompile?: boolean;
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
  durMin?: number; // Minimum duration in microseconds
  durMax?: number; // Maximum duration in microseconds
  tsMin?: number; // Minimum timestamp in microseconds
  tsMax?: number; // Maximum timestamp in microseconds
}

/**
 * Statistics returned by reduceTraceFile
 */
export interface TraceReductionStats {
  originalEventCount: number;
  filteredEventCount: number;
  removedEventCount: number;
  originalSize: number;
  cleanedSize: number;
  inputFile: string;
  outputFile: string;
}

/**
 * Pure function to determine if an event is network-related
 * @param event - The trace event object
 * @returns True if the event is network-related, false otherwise
 */
export function isNetworkEvent(event: TraceEvent): boolean {
  // Check category-based network events
  const hasNetworkCategory =
    event.cat &&
    (event.cat.includes('netlog') ||
      event.cat.includes('network') ||
      event.cat.includes('loading') ||
      event.cat.includes('net') ||
      event.cat.includes('devtools.network'));

  // Check name-based network events
  const hasNetworkName =
    event.name &&
    (event.name.includes('ResourceSendRequest') ||
      event.name.includes('ResourceReceiveResponse') ||
      event.name.includes('ResourceReceivedData') ||
      event.name.includes('ResourceFinish') ||
      event.name.includes('ResourceLoad') ||
      event.name.includes('fetch') ||
      event.name.includes('XMLHttpRequest') ||
      event.name.includes('network') ||
      event.name.includes('HTTP'));

  return Boolean(hasNetworkCategory || hasNetworkName);
}

/**
 * Pure function to determine if an event is animation-related
 * @param event - The trace event object
 * @returns True if the event is animation-related, false otherwise
 */
export function isAnimationEvent(event: TraceEvent): boolean {
  // Check category-based animation events
  const hasAnimationCategory =
    event.cat &&
    (event.cat.includes('animation') ||
      event.cat.includes('animations') ||
      event.cat.includes('blink.animations') ||
      event.cat.includes('cc.animation') ||
      event.cat.includes('devtools.animation'));

  // Check name-based animation events
  const hasAnimationName =
    event.name &&
    (event.name.includes('Animation') ||
      event.name.includes('Animate') ||
      event.name.includes('Keyframe') ||
      event.name.includes('Transition') ||
      event.name.includes('RequestAnimationFrame') ||
      event.name.includes('CancelAnimationFrame') ||
      event.name.includes('AnimationWorklet') ||
      event.name.includes('CompositorAnimation'));

  return Boolean(hasAnimationCategory || hasAnimationName);
}

/**
 * Pure function to determine if an event is GPU-related
 * @param event - The trace event object
 * @returns True if the event is GPU-related, false otherwise
 */
export function isGPUEvent(event: TraceEvent): boolean {
  // Check category-based GPU events
  const hasGPUCategory =
    event.cat &&
    (event.cat.includes('gpu') ||
      event.cat.includes('GPU') ||
      event.cat.includes('cc') ||
      event.cat.includes('viz') ||
      event.cat.includes('compositor') ||
      event.cat.includes('gl') ||
      event.cat.includes('skia') ||
      event.cat.includes('devtools.gpu'));

  // Check name-based GPU events
  const hasGPUName =
    event.name &&
    (event.name.includes('GPU') ||
      event.name.includes('Compositor') ||
      event.name.includes('GLRenderer') ||
      event.name.includes('VizDisplayCompositor') ||
      event.name.includes('DrawFrame') ||
      event.name.includes('SwapBuffers') ||
      event.name.includes('GPUTask') ||
      event.name.includes('RasterTask') ||
      event.name.includes('TileManager') ||
      event.name.includes('LayerTreeHost'));

  return Boolean(hasGPUCategory || hasGPUName);
}

/**
 * Extracts thread pool thread identifiers (PID+TID) from metadata events
 * @param traceEvents - Array of trace events to scan for metadata
 * @returns Set of "pid-tid" strings representing thread pool threads
 */
export function extractThreadPoolThreads(
  traceEvents: TraceEvent[]
): Set<string> {
  const threadPoolThreads = new Set<string>();

  traceEvents.forEach((event) => {
    // Look for thread name metadata events
    if (
      event.ph === 'M' &&
      event.name === 'thread_name' &&
      event.args?.name &&
      event.pid !== undefined &&
      event.tid !== undefined
    ) {
      const threadName = event.args.name.toLowerCase();

      // Check if this thread is a thread pool thread
      if (
        threadName.includes('threadpool') ||
        threadName.includes('thread pool') ||
        threadName.includes('worker') ||
        threadName.includes('background')
      ) {
        threadPoolThreads.add(`${event.pid}-${event.tid}`);
      }
    }
  });

  return threadPoolThreads;
}

/**
 * Pure function to determine if an event is from a thread pool thread
 * @param event - The trace event object
 * @param threadPoolThreads - Set of thread pool PID-TID combinations
 * @returns True if the event is from a thread pool thread, false otherwise
 */
export function isEventFromThreadPoolThread(
  event: TraceEvent,
  threadPoolThreads: Set<string>
): boolean {
  if (event.pid === undefined || event.tid === undefined) {
    return false;
  }

  return threadPoolThreads.has(`${event.pid}-${event.tid}`);
}

/**
 * Creates a ThreadPool event filter function based on metadata from trace events
 * @param traceEvents - Array of trace events to scan for thread pool metadata
 * @returns A function that can determine if an individual event is from a thread pool thread
 */
export function createThreadPoolEventFilter(traceEvents: TraceEvent[]) {
  const threadPoolThreads = extractThreadPoolThreads(traceEvents);

  return function isThreadPoolEvent(event: TraceEvent): boolean {
    // Preserve metadata events - they provide essential context
    if (event.ph === 'M') {
      return false;
    }

    return isEventFromThreadPoolThread(event, threadPoolThreads);
  };
}

/**
 * Pure function to determine if an event is ThreadPool-related (legacy - use createThreadPoolEventFilter instead)
 * @param event - The trace event object
 * @returns True if the event is ThreadPool-related, false otherwise
 * @deprecated Use createThreadPoolEventFilter for metadata-based filtering
 */
export function isThreadPoolEvent(event: TraceEvent): boolean {
  // Fallback to pattern-based approach for backwards compatibility
  // This should be replaced with metadata-based filtering using createThreadPoolEventFilter

  // Check event name for various thread pool patterns
  if (event.name) {
    const name = event.name.toLowerCase();
    if (name.includes('threadpoolforegroundworker')) {
      return true;
    }

    // Check for BackgroundProcessor:: pattern (case-insensitive)
    if (event.name.toLowerCase().startsWith('backgroundprocessor::')) {
      return true;
    }
  }

  // Check category for thread pool patterns
  if (event.cat) {
    const category = event.cat.toLowerCase();
    if (category.includes('thread pool') || category.includes('threadpool')) {
      return true;
    }
  }

  // Check args for thread pool information
  if (event.args && typeof event.args === 'object') {
    const argsStr = JSON.stringify(event.args).toLowerCase();
    if (argsStr.includes('thread pool') || argsStr.includes('threadpool')) {
      return true;
    }
  }

  return false;
}

/**
 * Pure function to determine if an event should be filtered based on duration
 * @param event - The trace event object
 * @param durMin - Minimum duration threshold in microseconds (events shorter than this are filtered)
 * @param durMax - Maximum duration threshold in microseconds (events longer than this are filtered)
 * @returns True if the event should be filtered out, false otherwise
 */
export function shouldFilterByDuration(
  event: TraceEvent,
  durMin?: number,
  durMax?: number
): boolean {
  // Only filter events that have a duration field
  if (event.dur === undefined) {
    return false;
  }

  // Filter out events shorter than minimum duration
  if (durMin !== undefined && event.dur < durMin) {
    return true;
  }

  // Filter out events longer than maximum duration
  if (durMax !== undefined && event.dur > durMax) {
    return true;
  }

  return false;
}

/**
 * Pure function to determine if an event should be filtered based on timestamp
 * @param event - The trace event object
 * @param tsMin - Minimum timestamp threshold in microseconds (events earlier than this are filtered)
 * @param tsMax - Maximum timestamp threshold in microseconds (events later than this are filtered)
 * @returns True if the event should be filtered out, false otherwise
 */
export function shouldFilterByTimestamp(
  event: TraceEvent,
  tsMin?: number,
  tsMax?: number
): boolean {
  // Skip timestamp filtering for metadata events - they provide essential context
  if (event.ph === 'M') {
    return false;
  }

  // All events should have a timestamp field
  if (event.ts === undefined) {
    return false;
  }

  // Filter out events earlier than minimum timestamp
  if (tsMin !== undefined && event.ts < tsMin) {
    return true;
  }

  // Filter out events later than maximum timestamp
  if (tsMax !== undefined && event.ts > tsMax) {
    return true;
  }

  return false;
}

/**
 * Pure function to determine if an event is a Streaming Compile Task-related event.
 * @param event - The trace event object.
 * @returns True if the event is related to streaming compilation, false otherwise.
 */
export function isStreamingCompileEvent(event: TraceEvent): boolean {
  if (event.name?.includes('Stream') && event.name?.includes('Compile'))
    return true;
  if (event.name?.includes('CompileTask')) return true;
  if (event.cat?.includes('v8.wasm') && event.name?.includes('Streaming'))
    return true;
  // Add more specific checks if needed based on typical event names/categories for these tasks
  return false;
}

/**
 * Filters trace events by removing network, animation, and GPU events based on options
 * @param traceEvents - Array of trace events
 * @param options - Filter options to control which event types to remove
 * @returns Filtered array of trace events
 */
export function filterTraceEvents(
  traceEvents: TraceEvent[],
  options: FilterOptions = DEFAULT_FILTER_OPTIONS
): TraceEvent[] {
  // Create metadata-based thread pool filter (first pass)
  const isThreadPoolEventFn = options.filterThreadPool
    ? createThreadPoolEventFilter(traceEvents)
    : () => false;

  return traceEvents.filter((event) => {
    if (options.filterNetwork && isNetworkEvent(event)) return false;
    if (options.filterAnimation && isAnimationEvent(event)) return false;
    if (options.filterGPU && isGPUEvent(event)) return false;

    // Use metadata-based thread pool filtering
    if (options.filterThreadPool && isThreadPoolEventFn(event)) return false;

    if (options.filterStreamingCompile && isStreamingCompileEvent(event))
      return false;

    // Duration filtering
    if (shouldFilterByDuration(event, options.durMin, options.durMax))
      return false;

    // Timestamp filtering
    if (shouldFilterByTimestamp(event, options.tsMin, options.tsMax))
      return false;

    if (
      options.includePhases &&
      options.includePhases.length > 0 &&
      !options.includePhases.includes(event.ph)
    )
      return false;
    if (
      options.excludePhases &&
      options.excludePhases.length > 0 &&
      options.excludePhases.includes(event.ph)
    )
      return false;

    if (
      options.includePids &&
      options.includePids.length > 0 &&
      (event.pid === undefined || !options.includePids.includes(event.pid))
    )
      return false;
    if (
      options.excludePids &&
      options.excludePids.length > 0 &&
      event.pid !== undefined &&
      options.excludePids.includes(event.pid)
    )
      return false;

    if (
      options.includeTids &&
      options.includeTids.length > 0 &&
      (event.tid === undefined || !options.includeTids.includes(event.tid))
    )
      return false;
    if (
      options.excludeTids &&
      options.excludeTids.length > 0 &&
      event.tid !== undefined &&
      options.excludeTids.includes(event.tid)
    )
      return false;

    if (
      options.includeNames &&
      options.includeNames.length > 0 &&
      (!event.name || !options.includeNames.includes(event.name))
    )
      return false;

    if (
      options.excludeNames &&
      options.excludeNames.length > 0 &&
      event.name &&
      options.excludeNames.includes(event.name)
    )
      return false;

    if (
      options.includeCats &&
      options.includeCats.length > 0 &&
      (!event.cat || !options.includeCats.includes(event.cat))
    )
      return false;

    if (
      options.excludeCats &&
      options.excludeCats.length > 0 &&
      event.cat &&
      options.excludeCats.includes(event.cat)
    )
      return false;

    return true;
  });
}

/**
 * Pure function to reduce trace data by filtering out unwanted events
 * @param traceData - Raw trace data string
 * @param options - Filter options to control which event types to remove
 * @returns Object containing filtered trace data and statistics
 */
export function reduceTrace(
  traceData: string,
  options: FilterOptions = DEFAULT_FILTER_OPTIONS
): {
  filteredTraceData: string;
  stats: Omit<TraceReductionStats, 'inputFile' | 'outputFile'>;
} {
  const trace: TraceFile = JSON.parse(traceData);

  // Validate trace structure - handle both array and object formats
  let traceEvents: TraceEvent[];
  if (Array.isArray(trace)) {
    traceEvents = trace;
  } else if (trace.traceEvents && Array.isArray(trace.traceEvents)) {
    traceEvents = trace.traceEvents;
  } else {
    throw new Error('traceEvents array not found in the trace file');
  }

  const originalEventCount = traceEvents.length;
  const originalSize = traceData.length;

  // Filter events
  const filteredEvents = filterTraceEvents(traceEvents, options);
  const removedEventCount = originalEventCount - filteredEvents.length;

  // Update trace object
  const resultTrace = Array.isArray(trace)
    ? filteredEvents
    : { ...trace, traceEvents: filteredEvents };

  // Generate cleaned data
  const filteredTraceData = JSON.stringify(resultTrace, null, 2);

  return {
    filteredTraceData,
    stats: {
      originalEventCount,
      filteredEventCount: filteredEvents.length,
      removedEventCount,
      originalSize,
      cleanedSize: filteredTraceData.length,
    },
  };
}

/**
 * Reduces a trace file by filtering out unwanted events
 * @param inputFile - Path to the input trace file
 * @param outputFile - Path to the output trace file
 * @param options - Filter options to control which event types to remove
 * @returns Statistics about the reduction process
 */
export function reduceTraceFile(
  inputFile: string,
  outputFile: string,
  options: FilterOptions = {
    filterNetwork: true,
    filterAnimation: true,
    filterGPU: true,
  }
): TraceReductionStats {
  // Read the original trace file
  const traceData = fs.readFileSync(inputFile, 'utf8');

  // Use pure function for processing
  const { filteredTraceData, stats } = reduceTrace(traceData, options);

  // Write cleaned data
  fs.writeFileSync(outputFile, filteredTraceData, 'utf8');

  return {
    ...stats,
    inputFile,
    outputFile,
  };
}
