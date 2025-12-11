import { describe, expect, it } from 'vitest';
import { getSmallestPidTidProfileInfo } from './profile-selection.js';
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
  startTime: 1_000_000,
  endTime: 1_001_000,
  samples: [3],
  timeDeltas: [1000],
};

// Create a shared test fixture
const createTestProfileInfo = (overrides = {}) => ({
  cpuProfile: minimalCpuProfile,
  startDate: new Date('2025-05-17T20:56:31.714Z'),
  pid: 10_001,
  tid: 20_001,
  sequence: 1,
  sourceFilePath: 'main.mjs',
  execArgs: ['node', '--prof-dev-kit', 'main.mjs'],
  ...overrides,
});

describe('getMainProfileInfo', () => {
  it('should throw error when no CPU profiles are provided', () => {
    expect(() => getSmallestPidTidProfileInfo([])).toThrowError(
      'No CPU profiles provided'
    );
  });

  it('should select profile with lowest pid as main profile', () => {
    const profiles = [
      createTestProfileInfo({ pid: 10_002, tid: 20_001 }),
      createTestProfileInfo({ pid: 10_001, tid: 20_002 }), // Should be selected as main
      createTestProfileInfo({ pid: 10_003, tid: 20_003 }),
    ];

    const result = getSmallestPidTidProfileInfo(profiles);
    expect(result.pid).toBe(10_001);
  });

  it('should select profile with lowest tid when pids are equal', () => {
    const profiles = [
      createTestProfileInfo({ pid: 10_001, tid: 20_002 }),
      createTestProfileInfo({ pid: 10_001, tid: 20_001 }), // Should be selected as main
      createTestProfileInfo({ pid: 10_001, tid: 20_003 }),
    ];

    const result = getSmallestPidTidProfileInfo(profiles);
    expect(result.tid).toBe(20_001);
  });

  it('should keep first profile when pid and tid are equal', () => {
    const firstProfile = createTestProfileInfo({ pid: 10_001, tid: 20_001 });
    const profiles = [
      firstProfile, // Should be kept as main
      createTestProfileInfo({ pid: 10_001, tid: 20_001 }),
    ];

    const result = getSmallestPidTidProfileInfo(profiles);
    expect(result).toBe(firstProfile);
  });
});
