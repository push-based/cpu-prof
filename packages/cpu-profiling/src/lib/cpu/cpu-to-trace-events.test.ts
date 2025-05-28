import { describe, expect, it, vi } from 'vitest';
import {
  cpuProfilesToTraceFile,
  cpuProfileToTraceProfileEvents,
  getProcessNameTraceEvent,
} from './cpu-to-trace-events';
import * as profileSelection from './profile-selection';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { CPUProfile } from './cpuprofile.types';
import { readFileSync } from 'fs';
import { CpuProfileInfo } from './cpuprofile.types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const minimalProfilesPath = join(
  __dirname,
  '..',
  '..',
  '..',
  'mocks',
  'fixtures',
  'minimal'
);
const parseCpuProfile = (path: string) => {
  return JSON.parse(readFileSync(join(minimalProfilesPath, path), 'utf8'));
};

// load miniman pyramide
const pyramideCpuProfile: CPUProfile = parseCpuProfile(
  'pyramide.cpuprofile.json'
);
const stairUpCpuProfile: CPUProfile = parseCpuProfile(
  'stair-up.cpuprofile.json'
);
const stairDownCpuProfile: CPUProfile = parseCpuProfile(
  'stair-down.cpuprofile.json'
);
const flatLineCpuProfile: CPUProfile = parseCpuProfile(
  'flat-line.cpuprofile.json'
);
const valleyCpuProfile: CPUProfile = parseCpuProfile('valley.cpuprofile.json');
const alternatingCpuProfile: CPUProfile = parseCpuProfile(
  'alternating-peaks.cpuprofile.json'
);

// Create a shared test fixture
const createTestProfileInfo = (overrides: {
  cpuProfile: CPUProfile;
  startDate?: Date;
  pid?: number;
  tid?: number;
  sequence?: number;
}): CpuProfileInfo => {
  const { cpuProfile, ...rest } = overrides;
  return {
    cpuProfile,
    startDate: new Date('2025-05-17T20:56:31.714Z'),
    pid: 10,
    tid: 11,
    sequence: 1,
    ...rest,
  };
};

describe('cpuProfilesToTraceFile', () => {
  let getMainProfileInfoSpy: any;

  beforeAll(async () => {
    await mkdir(join(__dirname, '__snapshots__'), { recursive: true });
  });

  beforeEach(() => {
    getMainProfileInfoSpy = vi.spyOn(profileSelection, 'getMainProfileInfo');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should convert a single CPU profile into a trace file with correct metadata and events', async () => {
    expect(
      cpuProfilesToTraceFile([
        {
          pid: 10,
          tid: 20,
          sequence: 1,
          startDate: new Date('2025-05-17T20:56:31.714Z'),
          cpuProfile: {
            nodes: [],
            startTime: 0,
            endTime: 0,
          },
        },
      ])
    ).toStrictEqual({
      metadata: {
        dataOrigin: 'TraceEvents',
        hardwareConcurrency: 1,
        source: 'DevTools',
        startTime: '2025-05-17T20:56:31.714Z',
      },
      traceEvents: expect.any(Array),
    });
  });

  it('should convert a single CPU profile into a trace file with correct Start/End Profile event', async () => {
    expect(
      cpuProfilesToTraceFile([
        {
          pid: 10,
          tid: 20,
          sequence: 1,
          startDate: new Date('2025-05-17T20:56:31.714Z'),
          cpuProfile: {
            nodes: [],
            startTime: 0,
            endTime: 0,
          },
        },
      ])
    ).toStrictEqual({
      metadata: expect.any(Object),
      traceEvents: [
        expect.any(Object),
        expect.any(Object),
        {
          args: {
            data: {
              startTime: 0,
            },
          },
          cat: 'v8',
          dur: 0,
          name: 'CpuProfiler::StartProfiling',
          ph: 'I',
          pid: 10,
          tid: 20,
          ts: 0,
        },
        expect.objectContaining({
          name: 'Profile',
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
        }),
        {
          name: 'CpuProfiler::StopProfiling',
          args: {
            data: {
              endTime: 0,
            },
          },
          cat: 'v8',
          dur: 0,
          ph: 'I',
          pid: 10,
          tid: 20,
          ts: 0,
        },
      ],
    });
  });

  it('should convert multiple CPU profiles with different thread IDs into a trace file format', async () => {
    const profiles = [
      createTestProfileInfo({ cpuProfile: stairDownCpuProfile }),
      createTestProfileInfo({ cpuProfile: stairUpCpuProfile, tid: 22 }),
      createTestProfileInfo({
        tid: 23,
        cpuProfile: { ...valleyCpuProfile, startTime: 20 },
      }),
    ];

    const output = cpuProfilesToTraceFile(profiles);

    expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles);
    await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(
      join(__dirname, '__snapshots__', 'multiple-cup-pids-trace.json')
    );
  });

  it('should merge 1 cpu profile and add a startTracingInBrowser event', async () => {
    const profiles = [
      createTestProfileInfo({ cpuProfile: pyramideCpuProfile }),
    ];

    expect(cpuProfilesToTraceFile(profiles)).toStrictEqual({
      metadata: expect.any(Object),
      traceEvents: expect.arrayContaining([
        expect.objectContaining({
          name: 'TracingStartedInBrowser',
        }),
      ]),
    });

    expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles);
  });

  it('should convert multiple CPU profiles with smosh=all option to a trace file format', async () => {
    const profiles = [
      createTestProfileInfo({ cpuProfile: flatLineCpuProfile, tid: 21 }),
      createTestProfileInfo({
        cpuProfile: { ...alternatingCpuProfile, startTime: 10 },
        tid: 22,
      }),
      createTestProfileInfo({
        pid: 12,
        tid: 21,
        cpuProfile: {
          ...pyramideCpuProfile,
          startTime: 20,
          endTime: pyramideCpuProfile.endTime + 20,
        },
      }),
      createTestProfileInfo({
        pid: 12,
        tid: 22,
        cpuProfile: {
          ...stairDownCpuProfile,
          startTime: 30,
          endTime: stairDownCpuProfile.endTime + 30,
        },
      }),
    ];

    const output = cpuProfilesToTraceFile(profiles, { smosh: 'all' });

    expect(getMainProfileInfoSpy).toHaveBeenCalledWith(
      profiles.map((z) => ({ ...z, pid: 1, tid: 1 }))
    );
    await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(
      join(__dirname, '__snapshots__', 'multiple-cup-smoosh-trace.json')
    );
  });

  it('should throw error when no CPU profiles are provided', () => {
    expect(() => cpuProfilesToTraceFile([])).toThrow(
      'No CPU profiles provided'
    );
  });

  it('should exclude TracingStartedInBrowser event when startTracingInBrowser is false', async () => {
    const profiles = [
      createTestProfileInfo({ cpuProfile: stairDownCpuProfile }),
    ];

    const result = cpuProfilesToTraceFile(profiles, {
      startTracingInBrowser: false,
    });

    expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles);

    // Check that TracingStartedInBrowser event is not included
    const traceEvents = Array.isArray(result) ? result : result.traceEvents;
    const tracingStartedEvent = traceEvents.find(
      (event: any) => event.name === 'TracingStartedInBrowser'
    );
    expect(tracingStartedEvent).toBeUndefined();

    // But other events should still be present
    expect(traceEvents.length).toBeGreaterThan(0);
    expect(traceEvents.some((event: any) => event.name === 'thread_name')).toBe(
      true
    );
  });
});
