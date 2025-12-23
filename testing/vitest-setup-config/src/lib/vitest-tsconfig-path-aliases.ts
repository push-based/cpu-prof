import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadConfig } from 'tsconfig-paths';
import type { Alias, AliasOptions } from 'vite';

/**
 * Loads TypeScript path aliases from tsconfig.base.json for use in Vitest.
 * Looks for tsconfig.base.json in the workspace root by traversing up from current directory.
 */
export function tsconfigPathAliases(): AliasOptions {
  // Find tsconfig.base.json by traversing up from current working directory
  let currentDir = process.cwd();
  let tsconfigPath: string | null = null;

  for (let i = 0; i < 10; i++) {
    // Prevent infinite loop
    const candidate = path.join(currentDir, 'tsconfig.base.json');
    if (fs.existsSync(candidate)) {
      tsconfigPath = candidate;
      break;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  if (!tsconfigPath) {
    throw new Error('Could not find tsconfig.base.json in workspace');
  }
  const result = loadConfig(tsconfigPath);

  if (result.resultType === 'failed') {
    throw new Error(
      `Failed to load path aliases from tsconfig for Vitest: ${result.message}`
    );
  }

  return Object.entries(result.paths)
    .map(([key, value]) => [key, value.at(0)])
    .filter((pair): pair is [string, string] => pair[1] != null)
    .map(
      ([importPath, relativePath]): Alias => ({
        find: importPath,
        // Make paths relative to workspace root (../../ from config file)
        replacement: path.resolve(process.cwd(), relativePath),
      })
    );
}
