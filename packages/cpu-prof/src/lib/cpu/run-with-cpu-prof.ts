import { spawn } from 'node:child_process';
import * as ansis from 'ansis';
import { mkdir } from 'node:fs/promises';

interface ProcessStdOutput {
  code: string | number | null;
}

function formatCommandLog(
  command: string,
  args: string[] = [],
  nodeOptions?: string
): string {
  const logElements: string[] = [];
  if (nodeOptions) {
    logElements.push(
      `${ansis.green('NODE_OPTIONS')}="${ansis.blueBright(nodeOptions)}"`
    );
  }
  logElements.push(ansis.cyan(command));
  if (args.length > 0) {
    logElements.push(ansis.white(args.join(' ')));
  }
  return logElements.join(' ');
}

async function executeChildProcess(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<ProcessStdOutput> {
  return new Promise((resolve, reject) => {
    const spawnedProcess = spawn(command, args, {
      shell: false,
      windowsHide: true,
      env,
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    spawnedProcess.on('error', (err: NodeJS.ErrnoException) => {
      reject(err);
    });

    spawnedProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ code });
      } else {
        const message = `Command failed with exit code ${code}`;
        reject(new Error(message));
      }
    });
  });
}

export async function runWithCpuProf(
  command: string,
  args: Record<string, ArgumentValue>,
  options: {
    cpuProfDir?: string;
    cpuProfInterval?: number;
    cpuProfName?: string;
  },
  logger: { log: (...args: string[]) => void } = console
): Promise<ProcessStdOutput> {
  const { cpuProfDir, cpuProfInterval, cpuProfName } = options;
  const nodeOptions = objectToCliArgs({
    ['cpu-prof']: true,
    ...(cpuProfDir ? { ['cpu-prof-dir']: cpuProfDir } : {}),
    ...(cpuProfInterval ? { ['cpu-prof-interval']: cpuProfInterval } : {}),
    ...(cpuProfName ? { ['cpu-prof-name']: cpuProfName } : {}),
  }).join(' ');
  const argsArray = objectToCliArgs(args);

  logger.log(formatCommandLog(command, argsArray, nodeOptions));

  try {
    const result = await executeChildProcess(command, argsArray, {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    });
    logger.log(`Profiles generated  - ${cpuProfDir}`);
    return result;
  } catch (error) {
    logger.log(`Failed to generate profiles - ${cpuProfDir}`);
    throw error;
  }
}

type ArgumentValue = number | string | boolean | string[];
export type CliArgsObject<T extends object = Record<string, ArgumentValue>> =
  T extends never
    ? Record<string, ArgumentValue | undefined> | { _: string }
    : T;

/**
 * Converts an object with different types of values into an array of command-line arguments.
 *
 * @example
 * const args = objectToCliArgs({
 *   _: ['node', 'index.js'], // node index.js
 *   name: 'Juanita', // --name=Juanita
 *   formats: ['json', 'md'] // --format=json --format=md
 * });
 */
export function objectToCliArgs<
  T extends object = Record<string, ArgumentValue>
>(params?: CliArgsObject<T>): string[] {
  if (!params) {
    return [];
  }

  return Object.entries(params).flatMap(([key, value]) => {
    // process/file/script
    if (key === '_') {
      return Array.isArray(value) ? value : [`${value}`];
    }
    const prefix = key.length === 1 ? '-' : '--';
    // "-*" arguments (shorthands)
    if (Array.isArray(value)) {
      return value.map((v) => `${prefix}${key}="${v}"`);
    }
    // "--*" arguments ==========

    if (Array.isArray(value)) {
      return value.map((v) => `${prefix}${key}="${v}"`);
    }

    if (typeof value === 'object') {
      return Object.entries(value as Record<string, ArgumentValue>).flatMap(
        // transform nested objects to the dot notation `key.subkey`
        ([k, v]) => objectToCliArgs({ [`${key}.${k}`]: v })
      );
    }

    if (typeof value === 'string') {
      return [`${prefix}${key}="${value}"`];
    }

    if (typeof value === 'number') {
      return [`${prefix}${key}=${value}`];
    }

    if (typeof value === 'boolean') {
      return [`${prefix}${value ? '' : 'no-'}${key}`];
    }

    throw new Error(`Unsupported type ${typeof value} for key ${key}`);
  });
}
