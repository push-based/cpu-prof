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

  const nodeOptionsForLogging = cpuProfFlags.join(' ');

  let finalCommand = initialCommand;
  let finalArgs = [...initialArgs];
  // executionEnv is for the actual child process
  const executionEnv = { ...process.env };
  // Ensure problematic NODE_OPTIONS are not passed to the child through its actual environment
  delete executionEnv.NODE_OPTIONS;

  // Prepare a separate env object for executeProcess logging, including the desired NODE_OPTIONS string
  const envForExecuteProcessLogging = {
    ...executionEnv, // Include other env vars that might be passed to the child
    __FOR_LOGGING_NODE_OPTIONS__: nodeOptionsForLogging,
  };

  const isNodeExecutable =
    initialCommand.endsWith('node') || initialCommand.endsWith('node.exe');
  // A simple check for .js files. More robust checks could be added (e.g., shebang).
  const isJsFile = initialCommand.endsWith('.js');

  if (isNodeExecutable) {
    // Case: initialCommand is 'node', initialArgs are like ['script.js', ...scriptArgs]
    // Prepend cpuProfFlags to initialArgs.
    finalArgs = [...cpuProfFlags, ...initialArgs];
  } else if (isJsFile) {
    // Case: initialCommand is 'path/to/script.js', initialArgs are script arguments.
    // We need to invoke this with 'node' and pass cpuProfFlags to node.
    finalCommand = 'node'; // Or a configurable path to the node executable
    finalArgs = [...cpuProfFlags, initialCommand, ...initialArgs];
  } else {
    // Command is not 'node' and not recognized as a .js file.
    // CPU profiling flags are unlikely to apply correctly to non-Node.js commands directly.
    logger.log(
      `Warning: CPU profiling flags are intended for Node.js scripts. ` +
        `Command '${initialCommand}' may not be profiled as expected.`
    );
    // In this case, we run the command as is, without attempting to add CPU profiling flags,
    // as we don't know how to apply them.
  }

  const { stderr, code, duration } = await executeProcess(
    {
      command: finalCommand,
      args: finalArgs,
      // Pass the special env for executeProcess to use for logging
      // The actual env for the spawned process will be handled inside executeProcess
      // by stripping __FOR_LOGGING_NODE_OPTIONS__ before spawn.
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
