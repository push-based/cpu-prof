import { describe, it, expect } from 'vitest';
import { executeProcess } from '../../cpu-prof/src/lib/execute-process';
import { CLI_PATH } from '../mocks/constants';
import { join } from 'path';

describe('help-command', () => {
  const cliPath = join(__dirname, '../../../', CLI_PATH);

  it('should display help information for cpu-merge command', async () => {
    const { stdout, stderr, code } = await executeProcess({
      command: 'node',
      args: [cliPath, 'cpu-merge', '--help'],
    });

    expect(stdout).toMatchInlineSnapshot(`
      "Usage: cpu-prof <command> [options]

      PushBased Profiling - Advanced CPU profiling and trace file uti
      lities

      Commands:
        cpu-prof trace-reduce [inputFile]    Reduce Chrome DevTools trace files by filtering unwanted even
                                             ts
        cpu-prof merge <inputDir>            Merge multiple Chrome DevTools trace files or CPU profile fil
                                             es into a single file
        cpu-prof measure <commandToProfile>  Run a Node.js script with CPU profiling enabled and save the
                                             profile to disk

      Options:
        -h, --help     Show help                                                                 [boolean]
            --version  Show version number                                                       [boolean]
      "
    `);
    expect(stderr).toBe('');
    expect(code).toBe(0);
  });
});
