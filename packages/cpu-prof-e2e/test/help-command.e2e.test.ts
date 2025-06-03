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
        cpu-prof                                Run a Node.js script with CPU profiling enabled and save t
                                                he profile to disk                               [default]
        cpu-prof measure <commandToProfile...>  Run a Node.js script with CPU profiling enabled and save t
                                                he profile to disk
        cpu-prof merge <inputDir>               Merge multiple Chrome DevTools trace files or CPU profile
                                                files into a single file

      CPU Measure Options:
            --cpu-prof-dir       Directory to save the profile.
        [string] [default: "/Users/michael_hladky/WebstormProjects/nx-advanced-perf-logging/packages/cpu-p
                                                                                        rof-e2e/profiles"]
            --cpu-prof-interval  Interval in milliseconds to sample the command.                  [number]
            --cpu-prof-name      Name of the profile (auto-generated if not specified).           [string]
        -h, --help               Show help                                                       [boolean]

      Options:
            --version   Show version number                                                      [boolean]
            --flagMain  Adds prefix and command args to the profile name of the initial process.
                                                                                [boolean] [default: false]

      Examples:
        cpu-prof measure --cpu-prof-dir ./profiles node my  Profile \`node my_script.js --arg-for-script\` a
        _script.js --arg-for-script                         nd save to ./profiles. Options can be anywhere
                                                            .
        cpu-prof measure node my_app.js --cpu-prof-name bu  Profile \`node my_app.js\`, name it \`build-profi
        ild-profile --cpu-prof-interval 500                 le\` with 500ms interval. Options can be inters
                                                            persed.

      The command to profile and its arguments are explicitly parsed via the command definition.
              CPU Measure options (like --cpu-prof-dir) can be placed anywhere.

              Examples:
              cpu-prof measure node my_script.js --arg-for-script
              cpu-prof measure --cpu-prof-dir ./custom-profiles node my_app.js
              cpu-prof measure node my_app.js --cpu-prof-interval 100
      "
    `);
    expect(stderr).toBe('');
    expect(code).toBe(0);
  });
});
