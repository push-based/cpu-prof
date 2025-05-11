import {beforeEach, describe, expect, it} from 'vitest';
import {getCpuProfileName, parseCpuProfileName} from './utils';

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



