import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type ArgumentValue = number | string | boolean | string[];
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

    if (value == null) {
      return [];
    }

    throw new Error(`Unsupported type ${typeof value} for key ${key}`);
  });
}

/**
 * Converts a string to PascalCase with 'Schema' suffix
 * Examples:
 * - 'default' -> 'DefaultSchema'
 * - 'basicExecutorOptions' -> 'BasicExecutorOptionsSchema'
 * - 'my-config' -> 'MyConfigSchema'
 * - 'user_settings' -> 'UserSettingsSchema'
 */
export function toPascalCaseSchemaName(
  exportName: string,
  suffix = 'Schema'
): string {
  if (exportName === 'default') {
    return 'DefaultSchema';
  }

  const pascalCase = exportName
    .split(/[-_\s]+|(?=[A-Z])/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  return pascalCase.endsWith(suffix) ? pascalCase : `${pascalCase}${suffix}`;
}

/**
 * Auto-derives output path from input path by replacing extension with .json
 */
export function deriveOutputPath(inputPath: string): string {
  const dir = path.dirname(inputPath);
  const name = path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${name}.json`);
}

/**
 * Loads a module and extracts a specific export
 *
 * @param schemaModulePath - Path to the module file
 * @param exportName - Name of the export to extract (defaults to 'default')
 * @returns The exported value from the module
 * @throws Error if the export is not found in the module
 */
export async function loadModuleExport<T = Record<string, unknown>>(
  schemaModulePath: string,
  exportName = 'default'
): Promise<T> {
  const modulePath = path.resolve(schemaModulePath);
  // Convert to file:// URL for Windows ESM compatibility
  const moduleUrl = pathToFileURL(modulePath).href;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const module = (await import(moduleUrl)) as any;

  const exportedValue = module[exportName] as T;
  if (!exportedValue) {
    throw new Error(
      `Export '${exportName}' not found in module '${schemaModulePath}'`
    );
  }

  return exportedValue;
}
