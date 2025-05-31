import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'node:child_process';
import { runWithCpuProf } from './run-with-cpu-prof';

// Mock ansis to just return the input string for all color functions
vi.mock('ansis', () => ({
  green: (s: string) => s,
  blueBright: (s: string) => s,
  cyan: (s: string) => s,
  white: (s: string) => s,
}));

describe('runWithCpuProf', () => {
  let spawnMock: ReturnType<typeof vi.fn>;
  let logger: { log: ReturnType<typeof vi.fn> };
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save and mock process.env
    originalEnv = process.env;
    process.env = { ...originalEnv };
    // Mock logger
    logger = { log: vi.fn() };
    // Mock spawn
    spawnMock = vi.fn();
    vi.spyOn(childProcess, 'spawn').mockImplementation(spawnMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('resolves on exit code 0', async () => {
    spawnMock.mockReturnValue({
      on: (e: string, cb: (...args: any[]) => void) => {
        if (e === 'close') setTimeout(() => cb(0), 0);
      },
      stdout: {},
      stderr: {},
      stdin: {},
    });
    await expect(
      runWithCpuProf('node', ['-v'], { dir: 'd' }, logger)
    ).resolves.toEqual({ code: 0 });
  });

  it('rejects on non-zero exit', async () => {
    spawnMock.mockReturnValue({
      on: (e: string, cb: (...args: any[]) => void) => {
        if (e === 'close') setTimeout(() => cb(1), 0);
      },
      stdout: {},
      stderr: {},
      stdin: {},
    });
    await expect(
      runWithCpuProf('node', ['-v'], { dir: 'd' }, logger)
    ).rejects.toThrow();
  });

  it('logs warning for non-node command', async () => {
    spawnMock.mockReturnValue({
      on: (e: string, cb: (...args: any[]) => void) => {
        if (e === 'close') setTimeout(() => cb(0), 0);
      },
      stdout: {},
      stderr: {},
      stdin: {},
    });
    await runWithCpuProf('bash', ['s'], { dir: 'd' }, logger);
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Warning'));
  });
});
