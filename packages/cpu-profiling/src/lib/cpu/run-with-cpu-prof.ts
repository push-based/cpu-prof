import { executeProcess } from '../utils/execute-process';

/**
 * Run a command with cpu-prof and log the result
 *
 * @param command - The command to run e.g. `node`
 * @param args - The command and arguments to run e.g. `['packages/cpu-profiling/dist/cpu-prof.esm.js', 'cpu-merge', './packages/cpu-profiling-e2e/mocks/ng-serve-cpu']`
 * @param options - The options to pass to the command
 * @returns The result of the command
 * @example
 * ```ts
 * runWithCpuProf('node', ['script.js'], {
 *   dir: './packages/cpu-profiling-e2e/mocks/ng-serve-cpu',
 *   name: 'ng-serve-cpu',
 *   interval: 1000,
 * })
 * ```
 */
export async function runWithCpuProf(
  initialCommand: string,
  initialArgs: string[],
  options: {
    dir: string;
    interval: number;
    name?: string;
  },
  logger: { log: (...args: string[]) => void } = console
): Promise<void> {
  const { dir, name, interval } = options;

  const cpuProfFlags = [
    '--cpu-prof',
    ...(dir ? [`--cpu-prof-dir=${dir}`] : []),
    ...(name ? [`--cpu-prof-name=${name}`] : []),
    ...(interval ? [`--cpu-prof-interval=${interval}`] : []),
  ];

  const nodeOptionsValue = cpuProfFlags.join(' ');

  // The command and arguments to execute directly.
  // Profiling flags will be passed via NODE_OPTIONS.
  const finalCommand = initialCommand;
  const finalArgs = [...initialArgs];

  // executionEnv is for the actual child process
  const executionEnv = { ...process.env };
  // Set NODE_OPTIONS for the child process to enable profiling.
  // Also, ensure any pre-existing NODE_OPTIONS is not simply overwritten,
  // though for this specific tool, we are explicitly setting it.
  executionEnv.NODE_OPTIONS = nodeOptionsValue;

  // Prepare a separate env object for executeProcess logging,
  // including the desired NODE_OPTIONS string for display purposes.
  const envForExecuteProcessLogging = {
    ...executionEnv, // This now includes our desired NODE_OPTIONS
    // __FOR_LOGGING_NODE_OPTIONS__ is used by executeProcess to know what to display.
    __FOR_LOGGING_NODE_OPTIONS__: nodeOptionsValue,
  };

  // The logic for prepending cpuProfFlags to command arguments is removed,
  // as flags are now passed exclusively through NODE_OPTIONS.

  // A simple check for .js files or node executable.
  // This warning can still be relevant if the command isn't node-related.
  const isNodeExecutable =
    initialCommand.endsWith('node') || initialCommand.endsWith('node.exe');
  const isJsFile = initialCommand.endsWith('.js');

  if (!isNodeExecutable && !isJsFile) {
    logger.log(
      `Warning: CPU profiling flags are set via NODE_OPTIONS and intended for Node.js scripts. ` +
        `Command '${initialCommand}' may not be profiled as expected.`
    );
  }

  const { stderr, code, duration } = await executeProcess(
    {
      command: finalCommand,
      args: finalArgs,
      // Pass the env that includes NODE_OPTIONS for the child and
      // __FOR_LOGGING_NODE_OPTIONS__ for the logger.
      env: envForExecuteProcessLogging,
    },
    logger
  );

  if (code === 0) {
    logger.log(`Profiles generated in ${duration}ms - ${dir}`);
  } else {
    logger.log(`Failed to generate profiles in ${duration}ms - ${dir}`);
    logger.log(stderr);
  }
}
