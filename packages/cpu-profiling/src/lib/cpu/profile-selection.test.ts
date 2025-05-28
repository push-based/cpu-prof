import { describe, expect, it } from 'vitest';
import { getMainProfileInfo } from './profile-selection';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { CPUProfile } from './cpu/cpuprofile.types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const minimalCpuProfile: CPUProfile = JSON.parse(
  (
    await readFile(
      join(__dirname, '../../mocks/fixtures/minimal.cpuprofile'),
      'utf8'
    )
  ).toString()
);

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
    expect(() => getMainProfileInfo([])).toThrow('No CPU profiles provided');
  });

  it('should select profile with lowest pid as main profile', () => {
    const profiles = [
      createTestProfileInfo({ pid: 10002, tid: 20001 }),
      createTestProfileInfo({ pid: 10001, tid: 20002 }), // Should be selected as main
      createTestProfileInfo({ pid: 10003, tid: 20003 }),
    ];

    const result = getMainProfileInfo(profiles);
    expect(result.pid).toBe(10001);
  });

  it('should select profile with lowest tid when pids are equal', () => {
    const profiles = [
      createTestProfileInfo({ pid: 10001, tid: 20002 }),
      createTestProfileInfo({ pid: 10001, tid: 20001 }), // Should be selected as main
      createTestProfileInfo({ pid: 10001, tid: 20003 }),
    ];

    const result = getMainProfileInfo(profiles);
    expect(result.tid).toBe(20001);
  });

  it('should keep first profile when pid and tid are equal', () => {
    const firstProfile = createTestProfileInfo({ pid: 10001, tid: 20001 });
    const profiles = [
      firstProfile, // Should be kept as main
      createTestProfileInfo({ pid: 10001, tid: 20001 }),
    ];

    const result = getMainProfileInfo(profiles);
    expect(result).toBe(firstProfile);
  });
});
