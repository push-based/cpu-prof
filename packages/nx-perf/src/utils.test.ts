import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {execWithCpuProf, getCpuProfileName, parseCpuProfileName} from './utils';
import {join} from "path";
import {readdir, readFile, rm} from "fs/promises";
import {execSync} from "node:child_process";
import {statSync} from "node:fs";
import {CpuProfile} from "./cpuprofile.types";
import {mkdir} from "node:fs/promises";

const PACKAGE_ROOT = join(__dirname, '..');
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..');
const TMP_DIR = join(PROJECT_ROOT, 'tmp');
const MOCKS_DIR = join(PACKAGE_ROOT, 'mocks');

/*
describe('microsecondsTimestampToDate', () => {
    it('should convert microseconds to date', () => {
        expect(microsecondsTimestampToDate(950265209160)).toBe('timestamp');
    });
})*/

describe('CPU profile file name generation', () => {
    const profGenDir = join(TMP_DIR, 'generate');
    beforeAll(async () => {
        try {
            if(statSync(profGenDir).isDirectory()) {
                await rm(profGenDir, {recursive: true});
            }
        } catch (e) {

        }
    })

    afterAll(async () => rm(profGenDir, {recursive: true}));

    it('date in filename is start date (within 1s)', async () => {
        const outDir = join(profGenDir, 'filename-date-is-start-date');
        await mkdir(outDir, {recursive: true});
        const startDate = new Date();
        const profileDur = 2000;

        // Fire off a very short profile so test doesn’t actually wait 10s
        expect(() => execSync(
            `node --cpu-prof --cpu-prof-dir=${outDir} -e "setTimeout(() => process.exit(0), ${profileDur})"`
        )).not.toThrow();

        const files = await readdir(outDir);
        expect(files).toHaveLength(1);

        const file = files[0];
        // Filename pattern: CPU.YYYYMMDD.HHMMSS.PID.TID.N.cpuprofile
        const m = file.match(/^CPU\.(\d{8})\.(\d{6})\.(\d+)\.(\d+)\.(\d+)\.cpuprofile$/);
        expect(m).not.toBeNull();

        const [, datePart, timePart] = m!;

        // Build a Date from the filename parts (using local time):
        //  datePart = "20250510" → YYYY=2025, MM=05, DD=10
        //  timePart = "134625" →  hh=13, mm=46, ss=25
        const fileDate = new Date(
            +datePart.slice(0, 4),     // year
            +datePart.slice(4, 6) - 1, // monthIndex
            +datePart.slice(6, 8),     // day
            +timePart.slice(0, 2),     // hour
            +timePart.slice(2, 4),     // minute
            +timePart.slice(4, 6)      // second
        );

        const profilePath = join(outDir, file);
        const profile: Required<CpuProfile> = JSON.parse((await readFile(profilePath)).toString());
        const profileDurMs = (profile.endTime - profile.startTime)/1000;

        //Check that the duration is correct
        expect(profileDurMs).toBeGreaterThan(profileDur-1);
        expect(profileDurMs).toBeLessThanOrEqual(profileDur+20);

        const deltaFilenameToStartMs = Math.abs(fileDate.getTime() - startDate.getTime());

        // Check that the filename date is within 1000ms of the profile start time
        expect(deltaFilenameToStartMs).toBeLessThanOrEqual(1000);
        const stats = statSync(profilePath);

        // check the difference from file birthtimeMs and filename date is close to profile duration
        // this means the date in the file name is younger than the file creating date
        expect(stats.birthtimeMs - fileDate.getTime()).toBeGreaterThanOrEqual(profileDur);
        expect(stats.birthtimeMs - fileDate.getTime()).toBeLessThan(profileDur+1000);
    });
})

describe('getCpuProfileName', () => {
    const sequenceMap = new Map();
    const testDate = new Date();
    testDate.setFullYear(2025);
    testDate.setMonth(4);
    testDate.setDate(10);
    testDate.setHours(13);
    testDate.setMinutes(46);
    testDate.setSeconds(25);

    beforeEach(() => {
        sequenceMap.clear();
    });

    it('should create a CPU profile name', async () => {
        const name = getCpuProfileName({
            prefix: 'CPU',
            pid: 51430,
            tid: 0,
            date: testDate
        }, sequenceMap);
        expect(name).toBe('CPU.20250510.134625.51430.0.001.cpuprofile');
    });

    it('should increment sequence number for same PID-TID combination', () => {
        const name1 = getCpuProfileName({pid: 12345, tid: 0, date: testDate}, sequenceMap);
        const name2 = getCpuProfileName({pid: 12345, tid: 0, date: testDate}, sequenceMap);
        const name3 = getCpuProfileName({pid: 12345, tid: 0, date: testDate}, sequenceMap);

        expect(name1).toBe('CPU.20250510.134625.12345.0.001.cpuprofile');
        expect(name2).toBe('CPU.20250510.134625.12345.0.002.cpuprofile');
        expect(name3).toBe('CPU.20250510.134625.12345.0.003.cpuprofile');
    });

    it('should not increment sequence number for different PID combination', () => {
        const name1 = getCpuProfileName({pid: 12345, tid: 0, date: testDate}, sequenceMap);
        const name2 = getCpuProfileName({pid: 12346, tid: 0, date: testDate}, sequenceMap);
        const name3 = getCpuProfileName({pid: 12347, tid: 0, date: testDate}, sequenceMap);

        expect(name1).toBe('CPU.20250510.134625.12345.0.001.cpuprofile');
        expect(name2).toBe('CPU.20250510.134625.12346.0.001.cpuprofile');
        expect(name3).toBe('CPU.20250510.134625.12347.0.001.cpuprofile');
    });

    it('should not increment sequence number for different TID combination', () => {
        const name1 = getCpuProfileName({pid: 12345, tid: 1, date: testDate}, sequenceMap);
        const name2 = getCpuProfileName({pid: 12345, tid: 2, date: testDate}, sequenceMap);
        const name3 = getCpuProfileName({pid: 12345, tid: 3, date: testDate}, sequenceMap);

        expect(name1).toBe('CPU.20250510.134625.12345.1.001.cpuprofile');
        expect(name2).toBe('CPU.20250510.134625.12345.2.001.cpuprofile');
        expect(name3).toBe('CPU.20250510.134625.12345.3.001.cpuprofile');
    });

    it('should support custom file extensions', () => {
        const customExt = getCpuProfileName({
            pid: 12345,
            date: testDate,
            extension: 'profile'
        }, sequenceMap);
        expect(customExt).toBe('CPU.20250510.134625.12345.0.001.profile');
    });

    it('should support custom prefix extensions', () => {
        const customExt = getCpuProfileName({
            pid: 12345,
            date: testDate,
            prefix: 'PROF'
        }, sequenceMap);
        expect(customExt).toBe('PROF.20250510.134625.12345.0.001.cpuprofile');
    });
})

describe('parseCpuProfileName', () => {
    it('should parse prefix of standard CPU profile name', () => {
        const name = 'CPU.20250510.134625.12345.0.001.cpuprofile';
        const {prefix} = parseCpuProfileName(name);
        expect(prefix).toBe('CPU');
    })

    it('should parse date of standard CPU profile name', () => {
        const name = 'CPU.20250510.134625.12345.0.001.cpuprofile';
        const {date} = parseCpuProfileName(name);
        const expected = new Date(2025, 4, 10, 13, 46, 25); // May 10, 2025, 13:46:25
        expect(date.getTime()).toBe(expected.getTime());
    })

    it('should parse PID of standard CPU profile name', () => {
        const name = 'CPU.20250510.134625.12345.0.001.cpuprofile';
        const {pid} = parseCpuProfileName(name);
        expect(pid).toBe(12345);
    })

    it('should parse TID of standard CPU profile name', () => {
        const name = 'CPU.20250510.134625.12345.0.001.cpuprofile';
        const {tid} = parseCpuProfileName(name);
        expect(tid).toBe(0);
    })

    it('should parse sequence of standard CPU profile name', () => {
        const name = 'CPU.20250510.134625.12345.0.001.cpuprofile';
        const {seq} = parseCpuProfileName(name);
        expect(seq).toBe(1);
    })

    it('should parse extension of standard CPU profile name', () => {
        const name = 'CPU.20250510.134625.12345.0.001.cpuprofile';
        const {extension} = parseCpuProfileName(name);
        expect(extension).toBe('cpuprofile');
    })
})

describe('execWithCpuProf', () => {
    const mergeTmp = join(TMP_DIR, 'nx-perf/merge')
    afterAll(async () => {
        await rm(mergeTmp, {recursive: true, force: true});
    });

    it.each([
        ['fork', join(MOCKS_DIR, 'program', 'fork-children.mjs')],
        ['spawn', join(MOCKS_DIR, 'program', 'spawn-children.mjs')],
        ['worker', join(MOCKS_DIR, 'program', 'worker-children.mjs')],
    ])('should create a CPU profiles', async (caseName, scriptPath) => {
        const testCaseDir = join(mergeTmp, caseName);

        await expect(execWithCpuProf({
            scriptPath,
            outputDir: testCaseDir,
            cpuProfOptions: {
                interval: 100
            }
        })).resolves.not.toThrow();

        const files = await readdir(testCaseDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles).toHaveLength(3);

        const profilePath = join(testCaseDir, cpuProfiles[0]);
        const profileContent = await readFile(profilePath, 'utf8');
        expect(() => JSON.parse(profileContent)).not.toThrow();
    });

});


