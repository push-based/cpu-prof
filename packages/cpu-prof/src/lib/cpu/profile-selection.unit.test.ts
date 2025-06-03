import { describe, expect, it } from 'vitest';
import { getSmallestPidTidProfileInfo } from './profile-selection';
import { CPUProfile } from './cpuprofile.types';

// Mock CPU profile data (based on stair-up.cpuprofile.json structure)
const minimalCpuProfile: CPUProfile = {
  nodes: [
    {
      id: 1,
      callFrame: {
        functionName: '(root)',
        scriptId: '0',
        url: '',
        lineNumber: -1,
        columnNumber: -1,
      },
      hitCount: 0,
      children: [2],
    },
    {
      id: 2,
      callFrame: {
        functionName: '(program)',
        scriptId: '0',
        url: '',
        lineNumber: -1,
        columnNumber: -1,
      },
      hitCount: 0,
      children: [3],
    },
    {
      id: 3,
      callFrame: {
        functionName: 'test',
        scriptId: '1',
        url: 'file:///test.js',
        lineNumber: 1,
        columnNumber: 0,
      },
      hitCount: 1,
    },
  ],
  startTime: 1000000,
  endTime: 1001000,
  samples: [3],
  timeDeltas: [1000],
};

// Create a shared test fixture
const createTestProfileInfo = (overrides = {}) => ({
  cpuProfile: minimalCpuProfile,
  startDate: new Date('2025-05-17T20:56:31.714Z'),
  pid: 10001,
  tid: 20001,
  sequence: 1,
  sourceFilePath: 'main.mjs',
  execArgs: ['node', '--cpu-prof', 'main.mjs'],
  ...overrides,
});

describe('getMainProfileInfo', () => {
  it('should throw error when no CPU profiles are provided', () => {
    expect(() => getSmallestPidTidProfileInfo([])).toThrow(
      'No CPU profiles provided'
    );
  });

  it('should select profile with lowest pid as main profile', () => {
    const profiles = [
      createTestProfileInfo({ pid: 10002, tid: 20001 }),
      createTestProfileInfo({ pid: 10001, tid: 20002 }), // Should be selected as main
      createTestProfileInfo({ pid: 10003, tid: 20003 }),
    ];

    const result = getSmallestPidTidProfileInfo(profiles);
    expect(result.pid).toBe(10001);
  });

  it('should select profile with lowest tid when pids are equal', () => {
    const profiles = [
      createTestProfileInfo({ pid: 10001, tid: 20002 }),
      createTestProfileInfo({ pid: 10001, tid: 20001 }), // Should be selected as main
      createTestProfileInfo({ pid: 10001, tid: 20003 }),
    ];

    const result = getSmallestPidTidProfileInfo(profiles);
    expect(result.tid).toBe(20001);
  });

  it('should keep first profile when pid and tid are equal', () => {
    const firstProfile = createTestProfileInfo({ pid: 10001, tid: 20001 });
    const profiles = [
      firstProfile, // Should be kept as main
      createTestProfileInfo({ pid: 10001, tid: 20001 }),
    ];

    const result = getSmallestPidTidProfileInfo(profiles);
    expect(result).toBe(firstProfile);
  });
});
