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

    // Replace the variable default path with a stable placeholder
    const processedStdout = stdout.replace(
      /(\[string\] \[default: \")([^\"]+)(\"\])/g,
      '$1[PATH_PLACEHOLDER]$3'
    );

    await expect(processedStdout).toMatchFileSnapshot(
      join(__dirname, 'help-command.e2e.test.stdout.txt')
    );
    expect(stderr).toBe('');
    expect(code).toBe(0);
  });
});
