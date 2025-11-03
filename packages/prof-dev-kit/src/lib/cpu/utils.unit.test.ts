import { beforeEach, describe, expect, it } from 'vitest';
import { getCpuProfileName, parseCpuProfileName } from './utils';
describe('getCpuProfileName', () => {
  const sequenceMap = new Map();
  const testDate = new Date(2025, 4, 10, 13, 46, 25); // May 10, 2025, 13:46:25

  beforeEach(() => {
    sequenceMap.clear();
  });

  it('should create a CPU profile name in format PREFIX.YYYYMMDD.HHMMSS.PID.TID.SEQ.EXT', async () => {
    expect(
      getCpuProfileName(
        {
          prefix: 'CPU',
          pid: 51430,
          tid: 0,
          date: testDate,
        },
        sequenceMap
      )
    ).toBe('CPU.20250510.134625.51430.0.001.cpuprofile');
  });

  it('should increment sequence number for same PID-TID combination', () => {
    expect(
      getCpuProfileName({ pid: 12345, tid: 0, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12345.0.001.cpuprofile');
    expect(
      getCpuProfileName({ pid: 12345, tid: 0, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12345.0.002.cpuprofile');
    expect(
      getCpuProfileName({ pid: 12345, tid: 0, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12345.0.003.cpuprofile');
  });

  it('should not increment sequence number for different PID combination', () => {
    expect(
      getCpuProfileName({ pid: 12345, tid: 0, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12345.0.001.cpuprofile');
    expect(
      getCpuProfileName({ pid: 12346, tid: 0, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12346.0.001.cpuprofile');
    expect(
      getCpuProfileName({ pid: 12347, tid: 0, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12347.0.001.cpuprofile');
  });

  it('should not increment sequence number for different TID combination', () => {
    expect(
      getCpuProfileName({ pid: 12345, tid: 1, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12345.1.001.cpuprofile');
    expect(
      getCpuProfileName({ pid: 12345, tid: 2, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12345.2.001.cpuprofile');
    expect(
      getCpuProfileName({ pid: 12345, tid: 3, date: testDate }, sequenceMap)
    ).toBe('CPU.20250510.134625.12345.3.001.cpuprofile');
  });

  it('should support custom file extensions', () => {
    const customExt = getCpuProfileName(
      {
        pid: 12345,
        date: testDate,
        extension: 'profile',
      },
      sequenceMap
    );
    expect(customExt).toBe('CPU.20250510.134625.12345.0.001.profile');
  });

  it('should support custom prefix extensions', () => {
    const customExt = getCpuProfileName(
      {
        pid: 12345,
        date: testDate,
        prefix: 'PROF',
      },
      sequenceMap
    );
    expect(customExt).toBe('PROF.20250510.134625.12345.0.001.cpuprofile');
  });
});

describe('parseCpuProfileName', () => {
  const VALID_PROFILE_NAME = 'CPU.20250510.134625.12345.0.001.cpuprofile';

  it('should parse prefix of standard CPU profile name', () => {
    expect(parseCpuProfileName(VALID_PROFILE_NAME)).toStrictEqual(
      expect.objectContaining({ prefix: 'CPU' })
    );
  });

  it('should parse date of standard CPU profile name', () => {
    const expected = new Date(2025, 4, 10, 13, 46, 25); // May 10, 2025, 13:46:25
    expect(parseCpuProfileName(VALID_PROFILE_NAME)).toStrictEqual(
      expect.objectContaining({ date: expected })
    );
  });

  it('should parse PID of standard CPU profile name', () => {
    expect(parseCpuProfileName(VALID_PROFILE_NAME)).toStrictEqual(
      expect.objectContaining({ pid: 12345 })
    );
  });

  it('should parse TID of standard CPU profile name', () => {
    expect(parseCpuProfileName(VALID_PROFILE_NAME)).toStrictEqual(
      expect.objectContaining({ tid: 0 })
    );
  });

  it('should parse sequence of standard CPU profile name', () => {
    expect(parseCpuProfileName(VALID_PROFILE_NAME)).toStrictEqual(
      expect.objectContaining({ seq: 1 })
    );
  });

  it('should parse extension of standard CPU profile name', () => {
    expect(parseCpuProfileName(VALID_PROFILE_NAME)).toStrictEqual(
      expect.objectContaining({ extension: 'cpuprofile' })
    );
  });

  it('should throw error for malformed profile name', () => {
    expect(() => parseCpuProfileName('invalid.profile.name')).toThrow();
  });
});
