import { describe, it, expect, afterAll } from 'vitest';
import { readFile, writeFile, mkdir, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mergeProfiles } from './merge-cpuprofile';

const execAsync = promisify(exec);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Go up from src to package root
const PACKAGE_ROOT = join(__dirname, '..');

const TMP_DIR = join(PACKAGE_ROOT, '../tmp/nx-perf/merge');
const MOCKS_DIR = join(PACKAGE_ROOT, 'mocks');
const CHILD_PROCESS = join(MOCKS_DIR, 'child-process.mjs');

describe('merge-cpuprofile', () => {
    afterAll(async () => {
        await rm(TMP_DIR, { recursive: true, force: true });
    });

    it('should create a single .cpuprofile and verify its content', async () => {
        const testCaseDir = join(TMP_DIR, 'single-setup');
        
        // Clean up and recreate test directory
        await rm(testCaseDir, { recursive: true, force: true });
        await mkdir(testCaseDir, { recursive: true });

        // Run child-process.mjs with CPU profiling
        const { stdout, stderr } = await execAsync(
            `node --cpu-prof --cpu-prof-interval=100 --cpu-prof-dir=${testCaseDir} ${CHILD_PROCESS}`,
            { cwd: MOCKS_DIR }
        );
        
        // Verify process output
        expect(stdout.trim()).toMatch(/PID \d+; Starting heavy computations/);
        expect(stdout.trim()).toMatch(/PID \d+; Tick 3, Round 3 completed:/);
        expect(stdout.trim()).toMatch(/PID \d+; All ticks completed/);
        // Verify no errors (ignoring experimental warning)
        expect(stderr).not.toMatch(/Error|error/i);

        // Check that exactly one CPU profile was created
        const files = await readdir(testCaseDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles.length).toBe(1);

        // Verify the profile content
        const profilePath = join(testCaseDir, cpuProfiles[0]);
        const profile = JSON.parse(await readFile(profilePath, 'utf8'));
        expect(profile).toHaveProperty('nodes');
        expect(profile).toHaveProperty('startTime');
        expect(profile).toHaveProperty('samples');
        expect(profile).toHaveProperty('timeDeltas');
    });

});

describe('mergeProfiles function', () => {
    it('should merge a single CPU profile into a single trace file', async () => {
        // Setup test directories
        const inputDir = join(TMP_DIR, 'merge-single-input');
        const outputDir = join(TMP_DIR, 'merge-single-output');
        const outputFile = join(outputDir, 'merged-trace.json');
        
        // Clean up and recreate directories
        await rm(inputDir, { recursive: true, force: true });
        await rm(outputDir, { recursive: true, force: true });
        await mkdir(inputDir, { recursive: true });

        // Generate a single CPU profile using child-process.mjs
        const { stderr } = await execAsync(
            `node --cpu-prof --cpu-prof-interval=100 --cpu-prof-dir=${inputDir} ${CHILD_PROCESS}`,
            { cwd: MOCKS_DIR }
        );
        expect(stderr).not.toMatch(/Error|error/i);

        // Verify we have exactly one profile
        const files = await readdir(inputDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles.length).toBe(1);

        // Merge the single profile
        await mergeProfiles(inputDir, outputDir, outputFile);

        // Verify the merged output
        const mergedContent = JSON.parse(await readFile(outputFile, 'utf8'));
        expect(mergedContent).toHaveProperty('traceEvents');
        expect(mergedContent).toHaveProperty('displayTimeUnit', 'ms');
        expect(mergedContent.traceEvents).toBeInstanceOf(Array);
        expect(mergedContent.traceEvents.length).toBeGreaterThan(0);

        // Verify trace event structure
        const event = mergedContent.traceEvents[0];
        expect(event).toHaveProperty('ph');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('pid');
        expect(event).toHaveProperty('tid');
        expect(event).toHaveProperty('ts');
        expect(event).toHaveProperty('cat');
        expect(event).toHaveProperty('args');

        // Verify thread metadata is present
        const metadataEvent = mergedContent.traceEvents.find((e: { ph: string; name: string }) => 
            e.ph === 'M' && e.name === 'thread_name'
        );
        expect(metadataEvent).toBeDefined();
        expect(metadataEvent?.args.name).toBe('Main Thread (.001)');
    });
});
