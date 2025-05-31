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
    it.each([['netlog'], ['loading']])(
      'should return true for %s category events',
      (cat) => {
        const event = { cat } as CompleteEvent;
        expect(isNetworkEvent(event)).toBe(true);
      }
    );

    it.each([['ResourceSendRequest'], ['fetch']])(
      'should return true for %s name events',
      (name) => {
        const event = { name } as CompleteEvent;
        expect(isNetworkEvent(event)).toBe(true);
      }
    );

    it('should return false for non-network events', () => {
      const event = {
        name: 'Layout',
        cat: 'devtools.timeline',
      } as CompleteEvent;
      expect(isNetworkEvent(event)).toBe(false);
    });

    it('should return false for events with no category or name', () => {
      const event = {} as CompleteEvent;
      expect(isNetworkEvent(event)).toBe(false);
    });
  });

  describe('isAnimationEvent', () => {
    it.each([['animation'], ['blink.animations']])(
      'should return true for %s category events',
      (cat) => {
        const event = { cat } as CompleteEvent;
        expect(isAnimationEvent(event)).toBe(true);
      }
    );

    it.each([['Animation'], ['RequestAnimationFrame']])(
      'should return true for %s name events',
      (name) => {
        const event = { name } as CompleteEvent;
        expect(isAnimationEvent(event)).toBe(true);
      }
    );

    it('should return false for non-animation events', () => {
      const event = {
        name: 'Layout',
        cat: 'devtools.timeline',
      } as CompleteEvent;
      expect(isAnimationEvent(event)).toBe(false);
    });
  });

  describe('isGPUEvent', () => {
    it.each([['gpu'], ['cc']])(
      'should return true for %s category events',
      (cat) => {
        const event = { cat } as CompleteEvent;
        expect(isGPUEvent(event)).toBe(true);
      }
    );

    it.each([['GPUTask'], ['Compositor']])(
      'should return true for %s name events',
      (name) => {
        const event = { name } as CompleteEvent;
        expect(isGPUEvent(event)).toBe(true);
      }
    );

    it('should return false for non-GPU events', () => {
      const event = {
        name: 'Layout',
        cat: 'devtools.timeline',
      } as CompleteEvent;
      expect(isGPUEvent(event)).toBe(false);
    });
  });

  describe('isStreamingCompileEvent', () => {
    it.each([['StreamCompileTask'], ['CompileTask']])(
      'should return true for %s name events',
      (name) => {
        const event = { name } as CompleteEvent;
        expect(isStreamingCompileEvent(event)).toBe(true);
      }
    );

    it('should return true for v8.wasm category with Streaming name', () => {
      const event = { cat: 'v8.wasm', name: 'Streaming' } as CompleteEvent;
      expect(isStreamingCompileEvent(event)).toBe(true);
    });

    it('should return false for non-streaming compile events', () => {
      const event = {
        name: 'Layout',
        cat: 'devtools.timeline',
      } as CompleteEvent;
      expect(isStreamingCompileEvent(event)).toBe(false);
    });
  });

  describe('extractThreadPoolThreads', () => {
    it('should extract thread pool threads from metadata events', () => {
      const events: TraceEvent[] = [
        {
          ph: 'M',
          name: 'thread_name',
          args: { name: 'ThreadPoolBackgroundWorker' },
          pid: 1,
          tid: 100,
        } as unknown as ThreadNameEvent,
        {
          ph: 'M',
          name: 'thread_name',
          args: { name: 'CrRendererMain' },
          pid: 1,
          tid: 200,
        } as unknown as ThreadNameEvent,
        {
          ph: 'M',
          name: 'thread_name',
          args: { name: 'WorkerThread' },
          pid: 2,
          tid: 300,
        } as unknown as ThreadNameEvent,
      ];

      const result = extractThreadPoolThreads(events);

      expect(result).toBeInstanceOf(Set);
      expect(result.has('1-100')).toBe(true);
      expect(result.has('2-300')).toBe(true);
      expect(result.has('1-200')).toBe(false);
    });

    it('should return empty set when no thread pool threads found', () => {
      const events: TraceEvent[] = [
        {
          ph: 'M',
          name: 'thread_name',
          args: { name: 'CrRendererMain' },
          pid: 1,
          tid: 1,
        } as unknown as ThreadNameEvent,
      ];

      const result = extractThreadPoolThreads(events);

      expect(result.size).toBe(0);
    });

    it('should handle events without required fields gracefully', () => {
      const events: TraceEvent[] = [
        {
          ph: 'M',
          name: 'thread_name',
          pid: 1,
          tid: 1,
        } as unknown as ThreadNameEvent, // Missing args
        {
          ph: 'X',
          name: 'RegularEvent',
          pid: 1,
          tid: 1,
        } as unknown as CompleteEvent, // Wrong event type
      ];

      const result = extractThreadPoolThreads(events);

      expect(result.size).toBe(0);
    });
  });

  describe('isEventFromThreadPoolThread', () => {
    it('should return true for events from thread pool threads', () => {
      const threadPoolThreads = new Set(['1-100', '2-200']);
      const event = { pid: 1, tid: 100 } as CompleteEvent;

      expect(isEventFromThreadPoolThread(event, threadPoolThreads)).toBe(true);
    });

    it('should return false for events not from thread pool threads', () => {
      const threadPoolThreads = new Set(['1-100', '2-200']);
      const event = { pid: 1, tid: 300 } as CompleteEvent;

      expect(isEventFromThreadPoolThread(event, threadPoolThreads)).toBe(false);
    });

    it('should return false for events without pid or tid', () => {
      const threadPoolThreads = new Set(['1-100']);
      const event = {} as CompleteEvent;

      expect(isEventFromThreadPoolThread(event, threadPoolThreads)).toBe(false);
    });
  });

  describe('createThreadPoolEventFilter', () => {
    it('should create a filter function that identifies thread pool events', () => {
      const events: TraceEvent[] = [
        {
          ph: 'M',
          name: 'thread_name',
          args: { name: 'ThreadPoolBackgroundWorker' },
          pid: 1,
          tid: 100,
        } as unknown as ThreadNameEvent,
      ];

      const filter = createThreadPoolEventFilter(events);
      const threadPoolEvent = { pid: 1, tid: 100 } as CompleteEvent;
      const regularEvent = { pid: 1, tid: 200 } as CompleteEvent;

      expect(filter(threadPoolEvent)).toBe(true);
      expect(filter(regularEvent)).toBe(false);
    });
  });

  describe('isThreadPoolEvent (deprecated)', () => {
    it.each([['ThreadPoolForegroundWorker'], ['BackgroundProcessor::DoWork']])(
      'should return true for %s name events',
      (name) => {
        const event = { name } as CompleteEvent;
        expect(isThreadPoolEvent(event)).toBe(true);
      }
    );

    it('should return true for thread pool category events', () => {
      const event = { cat: 'thread pool' } as CompleteEvent;
      expect(isThreadPoolEvent(event)).toBe(true);
    });

    it('should return true for threadpool in args', () => {
      const event = {
        args: { type: 'threadpool' },
      } as unknown as CompleteEvent;
      expect(isThreadPoolEvent(event)).toBe(true);
    });

    it('should return false for non-thread pool events', () => {
      const event = {
        name: 'Layout',
        cat: 'devtools.timeline',
      } as CompleteEvent;
      expect(isThreadPoolEvent(event)).toBe(false);
    });
  });

  describe('shouldFilterByDuration', () => {
    it('should return false for events without duration', () => {
      const event = { ph: 'M', name: 'thread_name' } as ThreadNameEvent; // Metadata events don't have duration
      expect(shouldFilterByDuration(event, 1000, 5000)).toBe(false);
    });

    it('should return true for events shorter than minimum duration', () => {
      const event = { dur: 500 } as CompleteEvent;
      expect(shouldFilterByDuration(event, 1000)).toBe(true);
    });

    it('should return true for events longer than maximum duration', () => {
      const event = { dur: 6000 } as CompleteEvent;
      expect(shouldFilterByDuration(event, undefined, 5000)).toBe(true);
    });

    it('should return false for events within duration range', () => {
      const event = { dur: 3000 } as CompleteEvent;
      expect(shouldFilterByDuration(event, 1000, 5000)).toBe(false);
    });

    it('should return false when no duration limits provided', () => {
      const event = { dur: 3000 } as CompleteEvent;
      expect(shouldFilterByDuration(event)).toBe(false);
    });
  });

  describe('shouldFilterByTimestamp', () => {
    it('should return false for metadata events regardless of timestamp', () => {
      const event = { ph: 'M', ts: 500 } as ThreadNameEvent;
      expect(shouldFilterByTimestamp(event, 1000, 5000)).toBe(false);
    });

    it('should return false for events without timestamp', () => {
      const event = {} as CompleteEvent;
      expect(shouldFilterByTimestamp(event, 1000, 5000)).toBe(false);
    });

    it('should return true for events earlier than minimum timestamp', () => {
      const event = { ts: 500 } as CompleteEvent;
      expect(shouldFilterByTimestamp(event, 1000)).toBe(true);
    });

    it('should return true for events later than maximum timestamp', () => {
      const event = { ts: 6000 } as CompleteEvent;
      expect(shouldFilterByTimestamp(event, undefined, 5000)).toBe(true);
    });

    it('should return false for events within timestamp range', () => {
      const event = { ts: 3000 } as CompleteEvent;
      expect(shouldFilterByTimestamp(event, 1000, 5000)).toBe(false);
    });
  });

  describe('filterTraceEvents', () => {
    it('should filter network events when filterNetwork is true', () => {
      expect(
        filterTraceEvents(
          [
            {
              name: 'ResourceSendRequest',
              cat: 'netlog',
            } as unknown as CompleteEvent,
            {
              name: 'Regular',
            } as unknown as CompleteEvent,
          ],
          { filterNetwork: true }
        )
      ).toStrictEqual([expect.objectContaining({ name: 'Regular' })]);
    });

    it('should filter animation events when filterAnimation is true', () => {
      expect(
        filterTraceEvents(
          [
            {
              name: 'Animation',
              cat: 'blink.animations',
            } as unknown as CompleteEvent,
            {
              name: 'Regular',
            } as unknown as CompleteEvent,
          ],
          { filterAnimation: true }
        )
      ).toStrictEqual([expect.objectContaining({ name: 'Regular' })]);
    });

    it('should filter GPU events when filterGPU is true', () => {
      expect(
        filterTraceEvents(
          [
            {
              name: 'GPUTask',
              cat: 'gpu',
            } as unknown as CompleteEvent,
            {
              name: 'Regular',
            } as unknown as CompleteEvent,
          ],
          { filterGPU: true }
        )
      ).toStrictEqual([expect.objectContaining({ name: 'Regular' })]);
    });

    it('should filter thread pool events when filterThreadPool is true', () => {
      expect(
        filterTraceEvents(
          [
            {
              ph: 'M',
              name: 'thread_name',
              args: { name: 'worker' },
              pid: 1,
              tid: 100,
            } as unknown as CompleteEvent,
            {
              pid: 1,
              tid: 100,
            } as unknown as CompleteEvent,
            {
              pid: 1,
              tid: 1,
            } as unknown as CompleteEvent,
          ],
          { filterThreadPool: true }
        )
      ).toStrictEqual([
        expect.objectContaining({ ph: 'M' }),
        expect.objectContaining({ pid: 1, tid: 1 }),
      ]);
    });

    it('should filter streaming compile events when filterStreamingCompile is true', () => {
      expect(
        filterTraceEvents(
          [
            {
              name: 'StreamCompileTask',
            } as unknown as CompleteEvent,
            {
              name: 'Regular',
            } as unknown as CompleteEvent,
          ],
          { filterStreamingCompile: true }
        )
      ).toStrictEqual([expect.objectContaining({ name: 'Regular' })]);
    });

    it('should filter by duration when durMin is provided', () => {
      expect(
        filterTraceEvents(
          [
            {
              name: 'ShortDuration',
              dur: 5000,
            } as unknown as CompleteEvent,
            {
              name: 'LongDuration',
              dur: 15000,
            } as unknown as CompleteEvent,
          ],
          { durMin: 10000 }
        )
      ).toStrictEqual([expect.objectContaining({ name: 'LongDuration' })]);
    });

    it('should return all events when no filters are applied', () => {
      expect(
        filterTraceEvents(
          [
            { name: 'Event1' } as unknown as CompleteEvent,
            { name: 'Event2' } as unknown as CompleteEvent,
          ],
          {}
        )
      ).toStrictEqual([
        expect.objectContaining({ name: 'Event1' }),
        expect.objectContaining({ name: 'Event2' }),
      ]);
    });
  });

  describe('reduceTrace', () => {
    it('should reduce trace data and return filtered data with stats', () => {
      const result = reduceTrace(
        JSON.stringify({
          traceEvents: [
            { name: 'Regular' },
            { name: 'ResourceSendRequest', cat: 'netlog' },
            { name: 'Animation', cat: 'blink.animations' },
          ],
          displayTimeUnit: 'ms',
        }),
        {
          filterNetwork: true,
          filterAnimation: true,
        }
      );

      expect(result.stats.originalEventCount).toBe(3);
      expect(result.stats.filteredEventCount).toBe(1);
      expect(result.stats.removedEventCount).toBe(2);
      expect(result.stats.originalSize).toBeGreaterThan(0);
      expect(result.stats.cleanedSize).toBeGreaterThan(0);
      expect(result.filteredTraceData).toContain('Regular');
      expect(result.filteredTraceData).not.toContain('ResourceSendRequest');
    });

    it('should handle array format trace data', () => {
      const result = reduceTrace(JSON.stringify([{ name: 'Regular' }]), {}); // Use empty options to avoid default filters

      expect(result.stats.originalEventCount).toBe(1);
      expect(result.stats.filteredEventCount).toBe(1);
    });

    it('should throw error for invalid trace data structure', () => {
      expect(() => reduceTrace(JSON.stringify({ invalidField: [] }))).toThrow(
        'traceEvents array not found in the trace file'
      );
    });

    it('should apply default filter options when none provided', () => {
      const result = reduceTrace(
        JSON.stringify({
          traceEvents: [{ name: 'ResourceSendRequest', cat: 'netlog' }],
        })
      );

      expect(result.stats.filteredEventCount).toBe(0); // Network event filtered by default
    });
  });
});
