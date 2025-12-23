import { describe, it, expect } from 'vitest';
import { executeProcess } from '@push-based/prof-dev-kit';
import { CLI_PATH } from '../mocks/constants.js';
import { join } from 'node:path';

describe('help-command', () => {
  const cliPath = join(__dirname, '../../../', CLI_PATH);

  it('should display help information for cpu-merge command', async () => {
    const { stdout, code } = await executeProcess({
      command: 'node',
      args: [cliPath, 'cpu-merge', '--help'],
    });

    // Replace the variable default path with a stable placeholder
    const processedStdout = stdout.replace(
      /(\[string] \[default: ")([^"]+)("])/g,
      '$1[PATH_PLACEHOLDER]$3'
    );

    await expect(processedStdout).toMatchFileSnapshot(
      join(__dirname, '__snapshots__', 'help-command.e2e.test.stdout.txt')
    );
    expect(code).toBe(0);
  });
});
