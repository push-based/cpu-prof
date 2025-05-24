import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Mock fs module at the top level
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

import {
  DEFAULT_FILTER_OPTIONS,
  FilterOptions,
  TraceReductionStats,
  isNetworkEvent,
  isAnimationEvent,
  isGPUEvent,
  isStreamingCompileEvent,
  extractThreadPoolThreads,
  isEventFromThreadPoolThread,
  createThreadPoolEventFilter,
  isThreadPoolEvent,
  shouldFilterByDuration,
  shouldFilterByTimestamp,
  filterTraceEvents,
  reduceTrace,
  reduceTraceFile,
} from './reduce-trace';
import {
  TraceEvent,
  CompleteEvent,
  ThreadNameEvent,
} from './traceprofile.types';
import * as fs from 'fs';

// Test data factory functions for type-safe event creation
const createCompleteEvent = (
  overrides: Partial<CompleteEvent> = {}
): CompleteEvent => ({
  ph: 'X',
  name: 'TestEvent',
  ts: 1000,
  dur: 1000,
  pid: 1,
  tid: 1,
  ...overrides,
});

const createNetworkEvent = (
  overrides: Partial<CompleteEvent> = {}
): CompleteEvent =>
  createCompleteEvent({
    name: 'ResourceSendRequest',
    cat: 'netlog',
    ...overrides,
  });

const createAnimationEvent = (
  overrides: Partial<CompleteEvent> = {}
): CompleteEvent =>
  createCompleteEvent({
    name: 'Animation',
    cat: 'blink.animations',
    ...overrides,
  });

const createGPUEvent = (
  overrides: Partial<CompleteEvent> = {}
): CompleteEvent =>
  createCompleteEvent({
    name: 'GPUTask',
    cat: 'gpu',
    ...overrides,
  });

const createStreamingCompileEvent = (
  overrides: Partial<CompleteEvent> = {}
): CompleteEvent =>
  createCompleteEvent({
    name: 'StreamCompileTask',
    cat: 'v8.wasm',
    ...overrides,
  });

const createThreadNameEvent = (
  overrides: Partial<ThreadNameEvent> = {}
): ThreadNameEvent => ({
  ph: 'M',
  name: 'thread_name',
  cat: '__metadata',
  args: { name: 'CrRendererMain' },
  ts: 1000,
  pid: 1,
  tid: 1,
  ...overrides,
});

const createThreadPoolMetadataEvent = (
  overrides: Partial<ThreadNameEvent> = {}
): ThreadNameEvent =>
  createThreadNameEvent({
    args: { name: 'ThreadPoolBackgroundWorker' },
    ...overrides,
  });

describe('reduce-trace', () => {
  describe('DEFAULT_FILTER_OPTIONS', () => {
    it('should have expected default filter settings', () => {
      expect(DEFAULT_FILTER_OPTIONS).toEqual({
        filterNetwork: true,
        filterAnimation: true,
        filterGPU: true,
        filterThreadPool: true,
        filterStreamingCompile: true,
        excludeNames: [
          'ResourceReceivedData',
          'UpdateCounters',
          'v8.evaluateModule',
        ],
        excludeCats: ['v8.compile'],
        durMin: 10000,
      });
    });
  });

  describe('isNetworkEvent', () => {
    it('should return true for network category events', () => {
      const event = createCompleteEvent({ cat: 'netlog' });
      expect(isNetworkEvent(event)).toBe(true);
    });

    it('should return true for loading category events', () => {
      const event = createCompleteEvent({ cat: 'loading' });
      expect(isNetworkEvent(event)).toBe(true);
    });

    it('should return true for ResourceSendRequest name events', () => {
      const event = createCompleteEvent({ name: 'ResourceSendRequest' });
      expect(isNetworkEvent(event)).toBe(true);
    });

    it('should return true for fetch name events', () => {
      const event = createCompleteEvent({ name: 'fetch' });
      expect(isNetworkEvent(event)).toBe(true);
    });

    it('should return false for non-network events', () => {
      const event = createCompleteEvent({
        name: 'Layout',
        cat: 'devtools.timeline',
      });
      expect(isNetworkEvent(event)).toBe(false);
    });

    it('should return false for events with no category or name', () => {
      const event = createCompleteEvent({ cat: undefined, name: undefined });
      expect(isNetworkEvent(event)).toBe(false);
    });
  });

  describe('isAnimationEvent', () => {
    it('should return true for animation category events', () => {
      const event = createCompleteEvent({ cat: 'animation' });
      expect(isAnimationEvent(event)).toBe(true);
    });

    it('should return true for blink.animations category events', () => {
      const event = createCompleteEvent({ cat: 'blink.animations' });
      expect(isAnimationEvent(event)).toBe(true);
    });

    it('should return true for Animation name events', () => {
      const event = createCompleteEvent({ name: 'Animation' });
      expect(isAnimationEvent(event)).toBe(true);
    });

    it('should return true for RequestAnimationFrame name events', () => {
      const event = createCompleteEvent({ name: 'RequestAnimationFrame' });
      expect(isAnimationEvent(event)).toBe(true);
    });

    it('should return false for non-animation events', () => {
      const event = createCompleteEvent({
        name: 'Layout',
        cat: 'devtools.timeline',
      });
      expect(isAnimationEvent(event)).toBe(false);
    });
  });

  describe('isGPUEvent', () => {
    it('should return true for gpu category events', () => {
      const event = createCompleteEvent({ cat: 'gpu' });
      expect(isGPUEvent(event)).toBe(true);
    });

    it('should return true for cc category events', () => {
      const event = createCompleteEvent({ cat: 'cc' });
      expect(isGPUEvent(event)).toBe(true);
    });

    it('should return true for GPU name events', () => {
      const event = createCompleteEvent({ name: 'GPUTask' });
      expect(isGPUEvent(event)).toBe(true);
    });

    it('should return true for Compositor name events', () => {
      const event = createCompleteEvent({ name: 'Compositor' });
      expect(isGPUEvent(event)).toBe(true);
    });

    it('should return false for non-GPU events', () => {
      const event = createCompleteEvent({
        name: 'Layout',
        cat: 'devtools.timeline',
      });
      expect(isGPUEvent(event)).toBe(false);
    });
  });

  describe('isStreamingCompileEvent', () => {
    it('should return true for events with Stream and Compile in name', () => {
      const event = createCompleteEvent({ name: 'StreamCompileTask' });
      expect(isStreamingCompileEvent(event)).toBe(true);
    });

    it('should return true for CompileTask name events', () => {
      const event = createCompleteEvent({ name: 'CompileTask' });
      expect(isStreamingCompileEvent(event)).toBe(true);
    });

    it('should return true for v8.wasm category with Streaming name', () => {
      const event = createCompleteEvent({ cat: 'v8.wasm', name: 'Streaming' });
      expect(isStreamingCompileEvent(event)).toBe(true);
    });

    it('should return false for non-streaming compile events', () => {
      const event = createCompleteEvent({
        name: 'Layout',
        cat: 'devtools.timeline',
      });
      expect(isStreamingCompileEvent(event)).toBe(false);
    });
  });

  describe('extractThreadPoolThreads', () => {
    it('should extract thread pool threads from metadata events', () => {
      const events: TraceEvent[] = [
        createThreadPoolMetadataEvent({ pid: 1, tid: 100 }),
        createThreadNameEvent({
          pid: 1,
          tid: 200,
          args: { name: 'CrRendererMain' },
        }),
        createThreadPoolMetadataEvent({
          pid: 2,
          tid: 300,
          args: { name: 'WorkerThread' },
        }),
      ];

      const result = extractThreadPoolThreads(events);

      expect(result).toBeInstanceOf(Set);
      expect(result.has('1-100')).toBe(true);
      expect(result.has('2-300')).toBe(true);
      expect(result.has('1-200')).toBe(false);
    });

    it('should return empty set when no thread pool threads found', () => {
      const events: TraceEvent[] = [
        createThreadNameEvent({ args: { name: 'CrRendererMain' } }),
      ];

      const result = extractThreadPoolThreads(events);

      expect(result.size).toBe(0);
    });

    it('should handle events without required fields gracefully', () => {
      const events: TraceEvent[] = [
        createThreadNameEvent({ args: undefined as any }), // Missing args
        createCompleteEvent({ name: 'RegularEvent' }), // Wrong event type
      ];

      const result = extractThreadPoolThreads(events);

      expect(result.size).toBe(0);
    });
  });

  describe('isEventFromThreadPoolThread', () => {
    it('should return true for events from thread pool threads', () => {
      const threadPoolThreads = new Set(['1-100', '2-200']);
      const event = createCompleteEvent({ pid: 1, tid: 100 });

      expect(isEventFromThreadPoolThread(event, threadPoolThreads)).toBe(true);
    });

    it('should return false for events not from thread pool threads', () => {
      const threadPoolThreads = new Set(['1-100', '2-200']);
      const event = createCompleteEvent({ pid: 1, tid: 300 });

      expect(isEventFromThreadPoolThread(event, threadPoolThreads)).toBe(false);
    });

    it('should return false for events without pid or tid', () => {
      const threadPoolThreads = new Set(['1-100']);
      const event = createCompleteEvent({ pid: undefined, tid: undefined });

      expect(isEventFromThreadPoolThread(event, threadPoolThreads)).toBe(false);
    });
  });

  describe('createThreadPoolEventFilter', () => {
    it('should create a filter function that identifies thread pool events', () => {
      const events: TraceEvent[] = [
        createThreadPoolMetadataEvent({ pid: 1, tid: 100 }),
      ];

      const filter = createThreadPoolEventFilter(events);
      const threadPoolEvent = createCompleteEvent({ pid: 1, tid: 100 });
      const regularEvent = createCompleteEvent({ pid: 1, tid: 200 });

      expect(filter(threadPoolEvent)).toBe(true);
      expect(filter(regularEvent)).toBe(false);
    });
  });

  describe('isThreadPoolEvent (deprecated)', () => {
    it('should return true for ThreadPoolForegroundWorker name events', () => {
      const event = createCompleteEvent({ name: 'ThreadPoolForegroundWorker' });
      expect(isThreadPoolEvent(event)).toBe(true);
    });

    it('should return true for BackgroundProcessor:: prefixed events', () => {
      const event = createCompleteEvent({
        name: 'BackgroundProcessor::DoWork',
      });
      expect(isThreadPoolEvent(event)).toBe(true);
    });

    it('should return true for thread pool category events', () => {
      const event = createCompleteEvent({ cat: 'thread pool' });
      expect(isThreadPoolEvent(event)).toBe(true);
    });

    it('should return true for threadpool in args', () => {
      const event = createCompleteEvent({ args: { type: 'threadpool' } });
      expect(isThreadPoolEvent(event)).toBe(true);
    });

    it('should return false for non-thread pool events', () => {
      const event = createCompleteEvent({
        name: 'Layout',
        cat: 'devtools.timeline',
      });
      expect(isThreadPoolEvent(event)).toBe(false);
    });
  });

  describe('shouldFilterByDuration', () => {
    it('should return false for events without duration', () => {
      const event = createThreadNameEvent(); // Metadata events don't have duration
      expect(shouldFilterByDuration(event, 1000, 5000)).toBe(false);
    });

    it('should return true for events shorter than minimum duration', () => {
      const event = createCompleteEvent({ dur: 500 });
      expect(shouldFilterByDuration(event, 1000)).toBe(true);
    });

    it('should return true for events longer than maximum duration', () => {
      const event = createCompleteEvent({ dur: 6000 });
      expect(shouldFilterByDuration(event, undefined, 5000)).toBe(true);
    });

    it('should return false for events within duration range', () => {
      const event = createCompleteEvent({ dur: 3000 });
      expect(shouldFilterByDuration(event, 1000, 5000)).toBe(false);
    });

    it('should return false when no duration limits provided', () => {
      const event = createCompleteEvent({ dur: 3000 });
      expect(shouldFilterByDuration(event)).toBe(false);
    });
  });

  describe('shouldFilterByTimestamp', () => {
    it('should return false for metadata events regardless of timestamp', () => {
      const event = createThreadNameEvent({ ts: 500 });
      expect(shouldFilterByTimestamp(event, 1000, 5000)).toBe(false);
    });

    it('should return false for events without timestamp', () => {
      const event = createCompleteEvent({ ts: undefined as any });
      expect(shouldFilterByTimestamp(event, 1000, 5000)).toBe(false);
    });

    it('should return true for events earlier than minimum timestamp', () => {
      const event = createCompleteEvent({ ts: 500 });
      expect(shouldFilterByTimestamp(event, 1000)).toBe(true);
    });

    it('should return true for events later than maximum timestamp', () => {
      const event = createCompleteEvent({ ts: 6000 });
      expect(shouldFilterByTimestamp(event, undefined, 5000)).toBe(true);
    });

    it('should return false for events within timestamp range', () => {
      const event = createCompleteEvent({ ts: 3000 });
      expect(shouldFilterByTimestamp(event, 1000, 5000)).toBe(false);
    });
  });

  describe('filterTraceEvents', () => {
    let testEvents: TraceEvent[];

    beforeEach(() => {
      testEvents = [
        createCompleteEvent({ name: 'Regular' }),
        createNetworkEvent(),
        createAnimationEvent(),
        createGPUEvent(),
        createStreamingCompileEvent(),
        createThreadPoolMetadataEvent({ pid: 1, tid: 100 }),
        createCompleteEvent({ pid: 1, tid: 100, name: 'ThreadPoolWork' }),
        createCompleteEvent({ dur: 5000, name: 'ShortDuration' }),
        createCompleteEvent({ dur: 15000, name: 'LongDuration' }),
        createCompleteEvent({ ph: 'X', name: 'CompleteEvent' }),
      ];
    });

    it('should filter network events when filterNetwork is true', () => {
      const options: FilterOptions = { filterNetwork: true };
      const result = filterTraceEvents(testEvents, options);

      expect(result.some((e) => e.name === 'ResourceSendRequest')).toBe(false);
      expect(result.some((e) => e.name === 'Regular')).toBe(true);
    });

    it('should filter animation events when filterAnimation is true', () => {
      const options: FilterOptions = { filterAnimation: true };
      const result = filterTraceEvents(testEvents, options);

      expect(result.some((e) => e.name === 'Animation')).toBe(false);
      expect(result.some((e) => e.name === 'Regular')).toBe(true);
    });

    it('should filter GPU events when filterGPU is true', () => {
      const options: FilterOptions = { filterGPU: true };
      const result = filterTraceEvents(testEvents, options);

      expect(result.some((e) => e.name === 'GPUTask')).toBe(false);
      expect(result.some((e) => e.name === 'Regular')).toBe(true);
    });

    it('should filter thread pool events when filterThreadPool is true', () => {
      const options: FilterOptions = { filterThreadPool: true };
      const result = filterTraceEvents(testEvents, options);

      expect(result.some((e) => e.name === 'ThreadPoolWork')).toBe(false);
      expect(result.some((e) => e.name === 'Regular')).toBe(true);
    });

    it('should filter streaming compile events when filterStreamingCompile is true', () => {
      const options: FilterOptions = { filterStreamingCompile: true };
      const result = filterTraceEvents(testEvents, options);

      expect(result.some((e) => e.name === 'StreamCompileTask')).toBe(false);
      expect(result.some((e) => e.name === 'Regular')).toBe(true);
    });

    it('should filter by duration when durMin is provided', () => {
      const options: FilterOptions = { durMin: 10000 };
      const result = filterTraceEvents(testEvents, options);

      expect(result.some((e) => e.name === 'ShortDuration')).toBe(false);
      expect(result.some((e) => e.name === 'LongDuration')).toBe(true);
    });

    it('should return all events when no filters are applied', () => {
      const options: FilterOptions = {};
      const result = filterTraceEvents(testEvents, options);

      expect(result).toHaveLength(testEvents.length);
    });
  });

  describe('reduceTrace', () => {
    const createSampleTraceData = () => {
      const traceEvents = [
        createCompleteEvent({ name: 'Regular' }),
        createNetworkEvent(),
        createAnimationEvent(),
      ];
      return {
        traceEvents,
        displayTimeUnit: 'ms' as const,
      };
    };

    it('should reduce trace data and return filtered data with stats', () => {
      const traceData = JSON.stringify(createSampleTraceData());
      const options: FilterOptions = {
        filterNetwork: true,
        filterAnimation: true,
      };

      const result = reduceTrace(traceData, options);

      expect(result.stats.originalEventCount).toBe(3);
      expect(result.stats.filteredEventCount).toBe(1);
      expect(result.stats.removedEventCount).toBe(2);
      expect(result.stats.originalSize).toBe(traceData.length);
      expect(result.stats.cleanedSize).toBeGreaterThan(0);
      expect(result.filteredTraceData).toContain('Regular');
      expect(result.filteredTraceData).not.toContain('ResourceSendRequest');
    });

    it('should handle array format trace data', () => {
      const traceEvents = [createCompleteEvent({ name: 'Regular' })];
      const traceData = JSON.stringify(traceEvents);

      const result = reduceTrace(traceData, {}); // Use empty options to avoid default filters

      expect(result.stats.originalEventCount).toBe(1);
      expect(result.stats.filteredEventCount).toBe(1);
    });

    it('should throw error for invalid trace data structure', () => {
      const invalidTraceData = JSON.stringify({ invalidField: [] });

      expect(() => reduceTrace(invalidTraceData)).toThrow(
        'traceEvents array not found in the trace file'
      );
    });

    it('should apply default filter options when none provided', () => {
      const traceData = JSON.stringify({
        traceEvents: [createNetworkEvent()],
      });

      const result = reduceTrace(traceData);

      expect(result.stats.filteredEventCount).toBe(0); // Network event filtered by default
    });
  });
});

describe('reduceTraceFile (integration)', () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const tmpDir = join(__dirname, '../../../tmp/reduce-trace-test');
  const mockInputFile = join(tmpDir, 'input.json');
  const mockOutputFile = join(tmpDir, 'output.json');

  beforeAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should read input file, process trace data, and write output file', () => {
    const inputTraceData = JSON.stringify({
      traceEvents: [
        createCompleteEvent({ name: 'Regular' }),
        createNetworkEvent(),
      ],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(inputTraceData);

    const result = reduceTraceFile(mockInputFile, mockOutputFile, {
      filterNetwork: true,
    });

    expect(fs.readFileSync).toHaveBeenCalledWith(mockInputFile, 'utf8');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockOutputFile,
      expect.stringContaining('Regular'),
      'utf8'
    );
    expect(result.inputFile).toBe(mockInputFile);
    expect(result.outputFile).toBe(mockOutputFile);
    expect(result.originalEventCount).toBe(2);
    expect(result.filteredEventCount).toBe(1);
  });

  it('should use default filter options when none provided', () => {
    const inputTraceData = JSON.stringify({
      traceEvents: [createCompleteEvent({ name: 'Regular' })],
    });

    vi.mocked(fs.readFileSync).mockReturnValue(inputTraceData);

    const result = reduceTraceFile(mockInputFile, mockOutputFile);

    expect(result.originalEventCount).toBe(1);
    expect(result.filteredEventCount).toBe(1);
  });
});
