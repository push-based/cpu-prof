import {describe, expect, it, vi} from "vitest";
import {cpuProfilesToTraceFile} from "./cpu-to-trace-events";
import * as profileSelection from "./profile-selection";
import {mkdir, readFile} from "fs/promises";
import {join} from "path";
import {fileURLToPath} from "url";
import {CpuProfile} from "./cpuprofile.types";

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const minimalCpuProfile: CpuProfile = JSON.parse((await readFile(join(__dirname, '../mocks/fixtures/minimal.cpuprofile'), 'utf8')).toString());

// Create a shared test fixture
const createTestProfileInfo = (overrides = {}) => ({
    cpuProfile: minimalCpuProfile,
    startDate: new Date("2025-05-17T20:56:31.714Z"),
    pid: 10001,
    tid: 20001,
    sequence: 1,
    sourceFilePath: 'main.mjs',
    execArgs: ['node', '--cpu-prof', 'main.mjs'],
    ...overrides
});

describe('cpuProfilesToTraceFile', () => {
    let getMainProfileInfoSpy: any;

    beforeAll(async () => {
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
    });

    beforeEach(() => {
        getMainProfileInfoSpy = vi.spyOn(profileSelection, 'getMainProfileInfo');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should convert a single CPU profile into a trace file with correct metadata and events', async () => {
        const profiles = [createTestProfileInfo()];
        
        const result = cpuProfilesToTraceFile(profiles);
        
        expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles);
        await expect(JSON.stringify(result, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', '1-simple-cup-trace.json'));
    });

    it('should convert multiple CPU profiles with different thread IDs into a trace file format', async () => {
        const profiles = [
            createTestProfileInfo(),
            createTestProfileInfo({ tid: 20002 }),
            createTestProfileInfo({
                tid: 20003,
                startDate: new Date("2025-05-17T20:56:30.714Z"),
                sourceFilePath: 'build.mjs',
                execArgs: ['node', '--cpu-prof', 'build.mjs']
            })
        ];
        
        const output = cpuProfilesToTraceFile(profiles);
        
        expect(getMainProfileInfoSpy).toHaveBeenCalledWith(profiles);
        await expect(JSON.stringify(output, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', 'multiple-cup-tids-trace.json'));
    });

    it('should throw error when no CPU profiles are provided', () => {
        expect(() => cpuProfilesToTraceFile([])).toThrow('No CPU profiles provided');
    });
});
