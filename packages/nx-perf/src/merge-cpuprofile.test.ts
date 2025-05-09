import { describe, it, expect, afterAll } from 'vitest';
import { readFile, writeFile, mkdir, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Go up from src to package root
const PACKAGE_ROOT = join(__dirname, '..');

const TMP_DIR = join(PACKAGE_ROOT, '../tmp/nx-perf/merge');
const MOCKS_DIR = join(PACKAGE_ROOT, 'mocks');
const CHILD_PROCESS = join(MOCKS_DIR, 'child-process.mjs');
const MAIN_WITH_CHILD = join(MOCKS_DIR, 'main-with-child.mjs');

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
            `node --cpu-prof --cpu-prof-dir=${testCaseDir} ${CHILD_PROCESS}`,
            { cwd: MOCKS_DIR }
        );
        
        // Verify process output
        expect(stdout.trim()).toMatch(/PID \d+; array length: \d+/);
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

    it('should create multiple profiles over time for each process', async () => {
        const testCaseDir = join(TMP_DIR, 'multi-time-setup');
        const numChildren = 2;
        const duration = 500; // 500ms duration to keep test time reasonable
        
        // Clean up and recreate test directory
        await rm(testCaseDir, { recursive: true, force: true });
        await mkdir(testCaseDir, { recursive: true });

        // Run main-with-child.mjs with specified number of children and duration
        const { stdout, stderr } = await execAsync(
            `node --cpu-prof --cpu-prof-dir=${testCaseDir} ${MAIN_WITH_CHILD} ${numChildren} ${duration}`,
        );
        
              // Verify no errors (ignoring experimental warning)
        expect(stderr).not.toMatch(/Error|error/i);

        // Check that CPU profiles were created
        const files = await readdir(testCaseDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        
        // We should have multiple profiles
        expect(cpuProfiles.length).toBeGreaterThanOrEqual(2); // Allow for some timing variance

        // Verify profile content
    
            const profilePath = join(testCaseDir, cpuProfiles.at(0));
            const profile = JSON.parse(await readFile(profilePath, 'utf8'));
            expect(profile).toHaveProperty('nodes');
            expect(profile).toHaveProperty('startTime');
            expect(profile).toHaveProperty('samples');
            expect(profile).toHaveProperty('timeDeltas');

            const profilePath2 = join(testCaseDir, cpuProfiles.at(1));
            const profile2 = JSON.parse(await readFile(profilePath2, 'utf8'));
            expect(profile2).toHaveProperty('nodes');
            expect(profile2).toHaveProperty('startTime');
            expect(profile2).toHaveProperty('samples');
            expect(profile2).toHaveProperty('timeDeltas');
        
    });
});
