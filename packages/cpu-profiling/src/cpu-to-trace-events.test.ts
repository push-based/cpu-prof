import {describe, expect, it} from "vitest";
import {cpuProfilesToTraceFile} from "./cpu-to-trace-events";
import {mkdir, readFile} from "fs/promises";
import {join} from "path";
import {fileURLToPath} from "url";
import {CpuProfile} from "./cpuprofile.types";

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const minimalCpuProfile: CpuProfile = JSON.parse((await readFile(join(__dirname, '../mocks/fixtures/minimal.cpuprofile'), 'utf8')).toString());

describe('convertCpuProfilesToTraceFile', () => {
    it('should convert 1 simple CPU profiles to trace file format', async () => {
        const result = cpuProfilesToTraceFile([
            {
                cpuProfile: minimalCpuProfile,
                startDate: new Date("2025-05-17T20:56:31.714Z"),
                pid: 10001,
                tid: 20001,
                sequence: 1,
                sourceFilePath: 'main.mjs',
                execArgs: ['node', '--cpu-prof', 'main.mjs'],
            }
        ]);

        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(result, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', '1-simple-cup-trace.json'));

    });

    it('should convert multiple CPU profiles with different thread IDs into a trace file format', async () => {
        const output = cpuProfilesToTraceFile([
            {
                cpuProfile: minimalCpuProfile,
                startDate: new Date("2025-05-17T20:56:31.714Z"),
                pid: 10001,
                tid: 20001,
                sequence: 1,
                sourceFilePath: 'main.mjs',
                execArgs: ['node', '--cpu-prof', 'main.mjs'],
            },
            {
                cpuProfile: minimalCpuProfile,
                startDate: new Date("2025-05-17T20:56:31.714Z"),
                pid: 10001,
                tid: 20002,
                sequence: 1,
                sourceFilePath: 'main.mjs',
                execArgs: ['node', '--cpu-prof', 'main.mjs'],
            },
            {
                cpuProfile: minimalCpuProfile,
                startDate: new Date("2025-05-17T20:56:30.714Z"),
                pid: 10001,
                tid: 20003,
                sequence: 1,
                sourceFilePath: 'build.mjs',
                execArgs: ['node', '--cpu-prof', 'build.mjs'],
            }
        ]);

        // Write output for snapshot comparison
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(output, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', 'multiple-cup-tids-trace.json'));
    });
});
