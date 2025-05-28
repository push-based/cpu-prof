import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  execWithCpuProf,
  getCpuProfileName,
  parseCpuProfileName,
} from './utils';
import { join } from 'path';
import { readdir, readFile, rm } from 'fs/promises';
import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { CPUProfile } from './cpu/cpuprofile.types';
import { mkdir } from 'node:fs/promises';

const PACKAGE_ROOT = join(__dirname, '..');
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..');
const TMP_DIR = join(PROJECT_ROOT, 'tmp');
const MOCKS_DIR = join(PACKAGE_ROOT, '..', 'mocks');

describe.todo(
  'CPU profile file name generation - This is here to test the official docs and our assumptions',
  () => {
    const profGenDir = join(TMP_DIR, 'generate');
    beforeAll(async () => {
      try {
        if (statSync(profGenDir).isDirectory()) {
          await rm(profGenDir, { recursive: true });
        }
      } catch (e) {}
    });

    afterAll(async () => rm(profGenDir, { recursive: true }));

    it('date in filename is start date (within 1s)', async () => {
      const outDir = join(profGenDir, 'filename-date-is-start-date');
      await mkdir(outDir, { recursive: true });
      const startDate = new Date();
      const profileDur = 2000;

      // Fire off a very short profile so test doesn't actually wait 10s
      expect(() =>
        execSync(
          `node --cpu-prof --cpu-prof-dir=${outDir} -e "setTimeout(() => process.exit(0), ${profileDur})"`
        )
      ).not.toThrow();

      const files = await readdir(outDir);
      expect(files).toHaveLength(1);

      const file = files[0];
      // Filename pattern: CPU.YYYYMMDD.HHMMSS.PID.TID.N.cpuprofile
      const m = file.match(
        /^CPU\.(\d{8})\.(\d{6})\.(\d+)\.(\d+)\.(\d+)\.cpuprofile$/
      );
      expect(m).not.toBeNull();

      const [, datePart, timePart] = m!;

      // Build a Date from the filename parts (using local time):
      //  datePart = "20250510" → YYYY=2025, MM=05, DD=10
      //  timePart = "134625" →  hh=13, mm=46, ss=25
      const fileDate = new Date(
        +datePart.slice(0, 4), // year
        +datePart.slice(4, 6) - 1, // monthIndex
        +datePart.slice(6, 8), // day
        +timePart.slice(0, 2), // hour
        +timePart.slice(2, 4), // minute
        +timePart.slice(4, 6) // second
      );

      const profilePath = join(outDir, file);
      const profile: Required<CPUProfile> = JSON.parse(
        (await readFile(profilePath)).toString()
      );
      const profileDurMs = (profile.endTime - profile.startTime) / 1000;

      //Check that the duration is correct
      expect(profileDurMs).toBeGreaterThan(profileDur - 1);
      expect(profileDurMs).toBeLessThanOrEqual(profileDur + 20);

      const deltaFilenameToStartMs = Math.abs(
        fileDate.getTime() - startDate.getTime()
      );

      // Check that the filename date is within 1000ms of the profile start time
      expect(deltaFilenameToStartMs).toBeLessThanOrEqual(1000);
      const stats = statSync(profilePath);

      // check the difference from file birthtimeMs and filename date is close to profile duration
      // this means the date in the file name is younger than the file creating date
      expect(stats.birthtimeMs - fileDate.getTime()).toBeGreaterThanOrEqual(
        profileDur
      );
      expect(stats.birthtimeMs - fileDate.getTime()).toBeLessThan(
        profileDur + 1000
      );
    });
  }
);

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

describe('execWithCpuProf', () => {
  const mergeTmp = join(TMP_DIR, 'cpu-profiling/merge');

  beforeEach(async () => {
    await rm(mergeTmp, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(mergeTmp, { recursive: true, force: true });
  });

  it.each([
    ['fork', join(MOCKS_DIR, 'program', 'fork-children.mjs')],
    ['spawn', join(MOCKS_DIR, 'program', 'spawn-children.mjs')],
    ['worker', join(MOCKS_DIR, 'program', 'worker-children.mjs')],
  ])(
    'should create CPU profiles for %s processes',
    async (caseName, scriptPath) => {
      const testCaseDir = join(mergeTmp, caseName);

      const result = await execWithCpuProf({
        scriptPath,
        outputDir: testCaseDir,
        cpuProfOptions: {
          interval: 100,
        },
      });

      expect(result.stdout).toContain('PID');
      expect(result.stderr).toBe('');

      const files = await readdir(testCaseDir);
      const cpuProfiles = files.filter(
        (f) => f.startsWith('CPU.') && f.endsWith('.cpuprofile')
      );
      expect(cpuProfiles).toHaveLength(3);

      const profilePath = join(testCaseDir, cpuProfiles[0]);
      const profileContent = await readFile(profilePath, 'utf8');
      const profile: CPUProfile = JSON.parse(profileContent);

      expect(profile).toMatchObject({
        nodes: expect.any(Array),
        samples: expect.any(Array),
        timeDeltas: expect.any(Array),
        startTime: expect.any(Number),
        endTime: expect.any(Number),
      });

      // Ensure timeDeltas exists before calculating average
      expect(profile.timeDeltas).toBeDefined();
      expect(profile.timeDeltas!.length).toBeGreaterThan(0);
    }
  );

  it('should respect custom CPU profiling options', async () => {
    const testCaseDir = join(mergeTmp, 'custom-options');

    await execWithCpuProf({
      scriptPath: '-e "console.log(\'Hello, world!\')"',
      outputDir: testCaseDir,
      cpuProfOptions: {
        interval: 500,
        name: 'custom-profile.cpuprofile',
      },
    });

    const files = await readdir(testCaseDir);
    expect(files).toContain('custom-profile.cpuprofile');
  });

  it('should create output directory if it does not exist', async () => {
    const testCaseDir = join(mergeTmp, 'new-dir/subdir');

    await execWithCpuProf({
      scriptPath: '-e "console.log(\'Hello, world!\')"',
      outputDir: testCaseDir,
    });

    const files = await readdir(testCaseDir);
    expect(files.length).toBeGreaterThan(0);
  });

  it('should throw on invalid script path', async () => {
    await expect(
      execWithCpuProf({
        scriptPath: 'non-existent.js',
        outputDir: mergeTmp,
      })
    ).rejects.toThrow();
  });

  it('should throw on timeout', async () => {
    const scriptPath = join(MOCKS_DIR, 'program', 'fork-children.mjs');

    await expect(
      execWithCpuProf({
        scriptPath,
        outputDir: mergeTmp,
        timeoutMs: 1,
      })
    ).rejects.toThrow();
  });

  it('should handle disabled profiling', async () => {
    const testCaseDir = join(mergeTmp, 'disabled');

    await execWithCpuProf({
      scriptPath: '-e "console.log(\'Hello, world!\')"',
      outputDir: testCaseDir,
      cpuProfOptions: {
        enabled: false,
      },
    });

    const files = await readdir(testCaseDir);
    expect(files.filter((f) => f.endsWith('.cpuprofile'))).toHaveLength(0);
  });
});
