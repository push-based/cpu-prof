import { describe, expect, it, vi, beforeEach } from 'vitest';
import { runWithCpuProf } from './run-with-cpu-prof.js';
import { executeProcess } from '../../../mocks/execute-process.js';

// Mock the executeProcess function
vi.mock('../../../mocks/execute-process.js', () => ({
  executeProcess: vi.fn(),
}));

const mockExecuteProcess = vi.mocked(executeProcess);

describe('runWithCpuProf', () => {
  const getConsoleLogSpy = () => (globalThis as any).consoleLogSpy;

  const mockOptions = {
    dir: './test-profiles',
    name: 'test-profile',
    interval: 1000,
  };

  const defaultMockResult = {
    stdout: 'Test output',
    stderr: '',
    code: 0,
    date: '2023-01-01T00:00:00.000Z',
    duration: 5000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteProcess.mockResolvedValue(defaultMockResult);
  });

  it('should execute process with correct NODE_OPTIONS when all options are provided', async () => {
    await expect(
      runWithCpuProf('node', ['script.js'], mockOptions)
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command:
        'NODE_OPTIONS="--cpu-prof --cpu-prof-dir=./test-profiles --cpu-prof-name=test-profile --cpu-prof-interval=1000" node',
      args: ['script.js'],
      cwd: './test-profiles',
    });
  });

  it('should exclude falsy options from NODE_OPTIONS', async () => {
    await expect(
      runWithCpuProf('node', ['script.js'], {
        dir: '', // falsy value
        name: '', // falsy value
        interval: 0, // falsy value
      })
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command: 'NODE_OPTIONS="--cpu-prof" node',
      args: ['script.js'],
      cwd: '', // cwd uses the dir value as-is
    });
  });

  it('should handle partial options correctly', async () => {
    await expect(
      runWithCpuProf('node', ['script.js'], {
        dir: './test-profiles',
        name: 'custom-name',
        interval: 0, // Should be excluded due to falsy value
      })
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command:
        'NODE_OPTIONS="--cpu-prof --cpu-prof-dir=./test-profiles --cpu-prof-name=custom-name" node',
      args: ['script.js'],
      cwd: './test-profiles',
    });
  });

  it('should log success message when process exits with code 0', async () => {
    mockExecuteProcess.mockResolvedValue({
      ...defaultMockResult,
      code: 0,
      duration: 3500,
    });

    await expect(
      runWithCpuProf('node', ['script.js'], mockOptions)
    ).resolves.not.toThrow();

    expect(getConsoleLogSpy()).toHaveBeenCalledWith(
      'Profiles generated in 3500ms - ./test-profiles'
    );
  });

  it('should log error message when process exits with non-zero code', async () => {
    mockExecuteProcess.mockResolvedValue({
      ...defaultMockResult,
      code: 1,
      duration: 2000,
      stderr: 'Error executing command',
    });

    await expect(
      runWithCpuProf('node', ['script.js'], mockOptions)
    ).resolves.not.toThrow();

    expect(getConsoleLogSpy()).toHaveBeenCalledWith(
      'Failed to generate profiles in 2000ms - ./test-profiles'
    );
    expect(getConsoleLogSpy()).toHaveBeenCalledWith('Error executing command');
  });

  it('should handle complex commands with multiple arguments', async () => {
    await expect(
      runWithCpuProf('npm', ['run', 'build', '--', '--prod'], {
        dir: './build-profiles',
        name: 'build-profile',
        interval: 500,
      })
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command:
        'NODE_OPTIONS="--cpu-prof --cpu-prof-dir=./build-profiles --cpu-prof-name=build-profile --cpu-prof-interval=500" npm',
      args: ['run', 'build', '--', '--prod'],
      cwd: './build-profiles',
    });
  });

  it('should handle different working directories', async () => {
    await expect(
      runWithCpuProf('node', ['index.js'], {
        dir: '/absolute/path/profiles',
        name: 'abs-profile',
        interval: 2000,
      })
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command:
        'NODE_OPTIONS="--cpu-prof --cpu-prof-dir=/absolute/path/profiles --cpu-prof-name=abs-profile --cpu-prof-interval=2000" node',
      args: ['index.js'],
      cwd: '/absolute/path/profiles',
    });
  });

  it('should propagate executeProcess rejections', async () => {
    const mockError = new Error('Process execution failed');
    mockExecuteProcess.mockRejectedValue(mockError);

    await expect(
      runWithCpuProf('node', ['script.js'], mockOptions)
    ).rejects.toThrow('Process execution failed');
  });

  it('should handle zero interval correctly', async () => {
    await expect(
      runWithCpuProf('node', ['script.js'], {
        dir: './test-profiles',
        name: 'test-profile',
        interval: 0,
      })
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command:
        'NODE_OPTIONS="--cpu-prof --cpu-prof-dir=./test-profiles --cpu-prof-name=test-profile" node',
      args: ['script.js'],
      cwd: './test-profiles',
    });
  });

  it('should handle empty string values correctly', async () => {
    await expect(
      runWithCpuProf('node', ['script.js'], {
        dir: './test-profiles',
        name: '',
        interval: 1000,
      })
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command:
        'NODE_OPTIONS="--cpu-prof --cpu-prof-dir=./test-profiles --cpu-prof-interval=1000" node',
      args: ['script.js'],
      cwd: './test-profiles',
    });
  });

  it('should preserve command structure with spaces and special characters', async () => {
    await expect(
      runWithCpuProf('node --inspect', ['script.js'], mockOptions)
    ).resolves.not.toThrow();

    expect(mockExecuteProcess).toHaveBeenCalledWith({
      command:
        'NODE_OPTIONS="--cpu-prof --cpu-prof-dir=./test-profiles --cpu-prof-name=test-profile --cpu-prof-interval=1000" node --inspect',
      args: ['script.js'],
      cwd: './test-profiles',
    });
  });
});
