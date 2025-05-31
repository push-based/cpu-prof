import { describe, it, expect } from 'vitest';
import { executeProcess } from '../../cpu-profiling/src/lib/utils/execute-process';
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
      "cpu-prof cpu-merge <inputDir>

      Merge multiple Chrome DevTools trace files or CPU profile files into a single file

      Positionals:
        inputDir  Directory containing CPU profile files to merge                      [string] [required]

      Basic Options:
        -h, --help     Show help                                                                 [boolean]
        -v, --verbose  Enable verbose logging                                   [boolean] [default: false]

      Options:
        -V, --version                Show version number                                         [boolean]
        -o, --outputDir              Output directory for merged profiles. Defaults to inputDir if not spe
                                     cified.                                                      [string]
        -b, --startTracingInBrowser  Include TracingStartedInBrowser event for better DevTools visualizati
                                     on                                          [boolean] [default: true]
        -s, --smosh                  Merge profiles with specific ID normalization. Use --smosh all to nor
                                     malize both PID and TID, --smosh pid to normalize only PID, or --smos
                                     h tid to normalize only TID. Omit flag to disable normalization.
                                                                   [string] [choices: "pid", "tid", "all"]

      Examples:
        cpu-prof cpu-merge ./path/to/profiles  Merge all profiles from a directory
      "
    `);
    expect(stderr).toBe('');
    expect(code).toBe(0);
  });
});
