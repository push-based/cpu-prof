import * as ansis from 'ansis';
import { executeProcess, type ProcessResult } from '../execute-process';
import * as process from 'node:process';
import { getCpuProfileName, parseCpuProfileName } from './utils';
import { encodeCmd } from '../utils/encode-command-data';
import { loadCpuProfiles } from './load-cpu-profiles';
import { getSmallestPidTidProfileInfo } from './profile-selection';
import { basename, join } from 'node:path';
import { rename } from 'node:fs/promises';

function formatCommandLog(
  command: string,
  args: string[] = [],
  nodeOptions?: string
): string {
  const logElements: string[] = [];
  if (nodeOptions) {
    logElements.push(
      `${ansis.green('NODE_OPTIONS')}="${ansis.blueBright(
        nodeOptions.replaceAll('"', '')
      )}"`
    );
  }
  logElements.push(ansis.cyan(command));
  if (args.length > 0) {
    logElements.push(ansis.white(args.join(' ')));
  }
  return logElements.join(' ');
}

export async function runWithCpuProf(
  command: string,
  args: Record<string, ArgumentValue>,
  options: {
    cpuProfDir?: string;
    cpuProfInterval?: number;
    cpuProfName?: string;
    flagMain?: boolean;
  },
  logger: { log: (...args: string[]) => void } = console,
  env: Record<string, string | undefined> = process.env
): Promise<Pick<ProcessResult, 'code'>> {
  const {
    cpuProfDir = join(process.cwd(), 'profiles'),
    cpuProfInterval,
    cpuProfName,
    flagMain,
  } = options;
  const nodeOptionsAsRecord = {
    'cpu-prof': true,
    ...(cpuProfDir ? { 'cpu-prof-dir': cpuProfDir } : {}),
    ...(cpuProfInterval ? { 'cpu-prof-interval': cpuProfInterval } : {}),
    ...(cpuProfName ? { 'cpu-prof-name': cpuProfName } : {}),
  };
  const nodeOptionsString = objectToCliArgs(nodeOptionsAsRecord).join(' ');
  const argsArray = objectToCliArgs(args);

  logger.log(formatCommandLog(command, argsArray, nodeOptionsString));

  try {
    // Construct the environment variables for executeProcess
    const envWithNodeOptions = {
      ...env,
      NODE_OPTIONS: nodeOptionsString,
    };
    const result = await executeProcess({
      command,
      args: argsArray,
      env: envWithNodeOptions,
      observer: {
        onStdout: (stdout) => {
          logger.log(stdout);
        },
        onStderr: (stderr) => {
          logger.log(stderr);
        },
      },
    });

    logger.log(`Profiles generated - ${cpuProfDir}`);

    if (flagMain) {
      const profiles = await loadCpuProfiles(cpuProfDir);
      const mainProfile = getSmallestPidTidProfileInfo(profiles);
      if (mainProfile) {
        const { pid, tid, seq, date } = parseCpuProfileName(
          basename(mainProfile.file)
        );
        const profName = getCpuProfileName({
          prefix: `MAIN-CPU--${encodeCmd(command, argsArray)}`,
          pid,
          tid,
          seq,
          date,
        });

        await rename(mainProfile.file, join(cpuProfDir, profName));

        logger.log(`Main profile inc base64 encoded command: ${profName}`);
      }
    }

    return { code: result.code };
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
