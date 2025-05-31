import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runWithCpuProf } from './run-with-cpu-prof';
import { join } from 'node:path';

vi.mock('ansis', () => ({
  green: (s: string) => s,
  blueBright: (s: string) => s,
  cyan: (s: string) => s,
  white: (s: string) => s,
}));

describe('runWithCpuProf', () => {
  let logger: { log: ReturnType<typeof vi.fn> };
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    logger = { log: vi.fn() };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('should be able to run "npm -v"', async () => {
    await expect(runWithCpuProf('npm', ['-v'], {}, logger)).resolves.toEqual({
      code: 0,
    });
  });

  it('should be able to run "node -v"', async () => {
    await expect(runWithCpuProf('node', ['-v'], {}, logger)).resolves.toEqual({
      code: 0,
    });
  });

  it('should be able to run "node child-process.mjs"', async () => {
    await expect(
      runWithCpuProf(
        'node',
        [join(__dirname, '..', '..', 'mocks', 'fixture', 'child-process.mjs')],
        {},
        logger
      )
    ).resolves.toEqual({ code: 0 });
  });

  it('should be able to run "nx --help"', async () => {
    await expect(runWithCpuProf('nx', ['--help'], {}, logger)).resolves.toEqual(
      { code: 0 }
    );
  });

  it('logs warning for non-node command', async () => {
    await expect(
      runWithCpuProf('bash', ['-c', 'echo ok'], {}, logger)
    ).resolves.toStrictEqual({ code: 0 });
  });
});
