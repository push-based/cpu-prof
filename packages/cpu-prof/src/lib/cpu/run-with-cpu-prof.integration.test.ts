import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { runWithCpuProf } from './run-with-cpu-prof';
import { join } from 'node:path';
import { access, readdir, rm, mkdir } from 'node:fs/promises';

vi.mock('ansis', () => ({
  green: (s: string) => s,
  blueBright: (s: string) => s,
  cyan: (s: string) => s,
  white: (s: string) => s,
}));

describe('runWithCpuProf', () => {
  const profilesDir = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
    'tmp',
    'run-with-cpu-prof'
  );

  let logger: { log: ReturnType<typeof vi.fn> };
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    await rm(profilesDir, { recursive: true, force: true });
    await mkdir(profilesDir, { recursive: true });
  });
  afterAll(async () => {
    await rm(profilesDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    logger = { log: vi.fn() };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('should profile a executable like  "npm -v"', async () => {
    const cpuProfDir = join(profilesDir, 'npm-v');
    await rm(cpuProfDir, { recursive: true, force: true });
    await expect(
      runWithCpuProf('npm', { _: ['-v'] }, { cpuProfDir })
    ).resolves.toEqual({ code: 0 });
    await expect(readdir(cpuProfDir)).resolves.toHaveLength(1);
  });
  it('should profile a script like "node script.js"', async () => {
    const cpuProfDir = join(profilesDir, 'node-script');
    await rm(cpuProfDir, { recursive: true, force: true });
    const mockScript = join(
      __dirname,
      '..',
      '..',
      'mocks',
      'fixture',
      'child-process.mjs'
    );
    await expect(
      runWithCpuProf('node', { _: [mockScript] }, { cpuProfDir }, logger)
    ).resolves.toEqual({ code: 0 });
    await expect(readdir(cpuProfDir)).resolves.toHaveLength(1);
  });

  it('should profile underlying task for "nx eslint --help" because nx is an orchestrator', async () => {
    const cpuProfDir = join(profilesDir, 'nx-eslint-help');
    await rm(cpuProfDir, { recursive: true, force: true });
    await expect(
      runWithCpuProf('nx', { _: ['eslint', '--help'] }, { cpuProfDir }, logger)
    ).resolves.toEqual({ code: 0 });
    await expect(readdir(cpuProfDir)).resolves.toHaveLength(1);
  });

  it('should run "nx run-many" and not pass invalid flags to underlying tools', async () => {
    const cpuProfDir = join(profilesDir, 'nx-run-many');
    await rm(cpuProfDir, { recursive: true, force: true });
    await expect(
      runWithCpuProf(
        'nx',
        {
          _: ['run-many'],
          target: 'build',
          projects: 'cpu-prof',
        },
        { cpuProfDir },
        logger
      )
    ).resolves.toEqual({ code: 0 });
    const files = await readdir(cpuProfDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it('should NOT profile an executable that doesnt have script usage like "node -v"', async () => {
    const cpuProfDir = join(profilesDir, 'node-v-profiled');

    await expect(
      runWithCpuProf('node', { v: true }, { cpuProfDir }, logger)
    ).resolves.toEqual({ code: 0 });
    await expect(access(cpuProfDir)).rejects.toThrow('ENOENT');
  });

  it('should NOT create profile files for a non-node command even if dir is provided', async () => {
    const cpuProfDir = join(profilesDir, 'bash-echo-ok-profile-attempt');

    await expect(
      runWithCpuProf('bash', { _: ['-c', 'echo ok'] }, { cpuProfDir }, logger)
    ).resolves.toStrictEqual({ code: 0 });
    await expect(access(cpuProfDir)).rejects.toThrow('ENOENT');
  });
});
