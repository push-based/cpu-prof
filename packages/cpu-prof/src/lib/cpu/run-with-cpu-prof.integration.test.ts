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
import { join, sep } from 'node:path';
import { access, readdir, rm, mkdir, writeFile } from 'node:fs/promises';

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
  let cpuProfDir: string;
  const originalCwd = process.cwd();
  const root = join(originalCwd, 'tmp', 'run-with-cpu-prof');

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
  afterEach(async () => {
    vi.restoreAllMocks();
    process.env = originalEnv;
    process.chdir(originalCwd);
    await rm(profilesDir, { recursive: true, force: true });
    await mkdir(profilesDir, { recursive: true });
  });

  it.runIf(process.allowedNodeEnvironmentFlags.has('--cpu-prof')).each([
    { name: 'the default profiles directory', directory: undefined },
    { name: 'an explicit absolute directory', directory: ['_dev', 'profiles'] },
    {
      name: 'a directory containing spaces',
      directory: ['_dev', 'workspace with spaces', 'profiles'],
    },
    {
      name: 'a directory with a trailing separator',
      directory: ['_dev', 'trailing', 'profiles', ''],
    },
  ])(
    'should collect main and child profiles in $name',
    async ({ directory }) => {
      const scriptPath = join(profilesDir, 'profile.cjs');
      await writeFile(
        scriptPath,
        `const { spawnSync } = require('node:child_process');
const child = spawnSync(process.execPath, ['--eval', '1 + 1'], { cwd: __dirname });
process.exitCode = child.status ?? 1;
`
      );
      process.chdir(profilesDir);
      const cpuProfDir = directory
        ? join(profilesDir, ...directory) + (directory.at(-1) === '' ? sep : '')
        : undefined;
      const outputDir = cpuProfDir ?? join(profilesDir, 'profiles');

      await expect(
        runWithCpuProf(
          'node',
          { _: [`"${scriptPath}"`] },
          { cpuProfDir, flagMain: true },
          logger
        )
      ).resolves.toEqual({ code: 0 });

      const files = await readdir(outputDir);
      expect(files.filter((file) => file.endsWith('.cpuprofile'))).toHaveLength(
        2
      );
      expect(
        files.filter((file) => file.startsWith('MAIN-CPU--'))
      ).toHaveLength(1);
    }
  );

  it.skip('should profile a executable like  "npm -v"', async () => {
    cpuProfDir = join(root, 'npm-v');
    await expect(
      runWithCpuProf('npm', { _: ['-v'] }, { cpuProfDir })
    ).resolves.toEqual({ code: 0 });
    await expect(readdir(cpuProfDir)).resolves.toHaveLength(1);
  });

  it.skip('should profile a script like "node script.js"', async () => {
    cpuProfDir = join(root, 'node-script-js');
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

  it.skip('should profile underlying task for "nx eslint --help" because nx is an orchestrator', async () => {
    cpuProfDir = join(root, 'nx-eslint-help');
    await rm(cpuProfDir, { recursive: true, force: true });
    await expect(
      runWithCpuProf(
        'nx',
        { _: ['eslint', '--help'] },
        { cpuProfDir },
        logger,
        {
          ...process.env,
        }
      )
    ).resolves.toEqual({ code: 0 });
    await expect(readdir(cpuProfDir)).resolves.toHaveLength(1);
  });

  it.skip('should run "nx run-many" and not pass invalid flags to underlying tools', async () => {
    cpuProfDir = join(root, 'nx-run-many-test');
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

  it.skip('should NOT profile an executable that doesnt have script usage like "node -v"', async () => {
    cpuProfDir = join(root, 'node-v');
    await rm(cpuProfDir, { recursive: true, force: true });
    await expect(
      runWithCpuProf('node', { v: true }, { cpuProfDir }, logger)
    ).resolves.toEqual({ code: 0 });
    await expect(access(cpuProfDir)).rejects.toThrow('ENOENT');
  });

  it('should NOT create profile files for a non-node command even if dir is provided', async () => {
    cpuProfDir = join(root, 'non-node-command');
    await rm(cpuProfDir, { recursive: true, force: true });
    await expect(
      runWithCpuProf('bash', { _: ['-c', 'echo ok'] }, { cpuProfDir }, logger)
    ).resolves.toStrictEqual({ code: 0 });
    await expect(access(cpuProfDir)).rejects.toThrow('ENOENT');
  });
});
