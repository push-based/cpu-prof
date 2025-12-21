import type { ExecutorContext, ProjectGraph } from '@nx/devkit';
import { cp, readdir, rename } from 'node:fs/promises';
import path from 'node:path';

export function executorContext<
  T extends { projectName: string; cwd?: string }
>(nameOrOpt: string | T): ExecutorContext {
  const { projectName, cwd = process.cwd() } =
    typeof nameOrOpt === 'string' ? { projectName: nameOrOpt } : nameOrOpt;
  return {
    cwd,
    isVerbose: false,
    projectName,
    root: '.',
    projectsConfigurations: {
      projects: {
        [projectName]: {
          name: projectName,
          root: `libs/${projectName}`,
        },
      },
      version: 1,
    },
    nxJsonConfiguration: {},
    projectGraph: { nodes: {}, dependencies: {} } satisfies ProjectGraph,
  };
}

/**
 * Files that need to be restored by removing the "_" prefix.
 * These files are prefixed with "_" in mock fixtures to avoid Nx detection.
 */
const NX_IGNORED_FILES_TO_RESTORE = new Set([
  '_package.json',
  '_nx.json',
  '_project.json',
]);

/**
 * Recursively renames files by removing the "_" prefix.
 * This is needed because mock fixtures have "_" prefix to avoid Nx detection.
 */
async function restoreNxIgnoredFiles(dir: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return restoreNxIgnoredFiles(fullPath);
      } else if (
        entry.isFile() &&
        NX_IGNORED_FILES_TO_RESTORE.has(entry.name)
      ) {
        return rename(fullPath, path.join(dir, entry.name.slice(1)));
      }
      return Promise.resolve();
    })
  );
}

/**
 * Sets up a test workspace by copying a mock fixture and restoring ignored files.
 * This is a simpler alternative to using Nx Tree for e2e tests.
 *
 * @param mockSourceDir - Full path to the mock fixture folder
 * @param targetDir - Directory where the mock should be copied to
 * @returns Promise that resolves when setup is complete
 *
 * @example
 * ```ts
 * const mockDir = path.join(import.meta.dirname, '../mocks/nx-monorepo');
 * const testDir = path.join(TEST_OUTPUT_DIR, 'my-test');
 * await setupTestWorkspace(mockDir, testDir);
 * // Now testDir contains a copy of the nx-monorepo mock with files restored
 * ```
 */
export async function setupTestWorkspace(
  mockSourceDir: string,
  targetDir: string
): Promise<void> {
  await cp(mockSourceDir, targetDir, { recursive: true });
  await restoreNxIgnoredFiles(targetDir);
}

export async function registerPluginInWorkspaceFile(
  workspaceRoot: string,
  configuration: string | { plugin: string; options?: Record<string, unknown> }
): Promise<void> {
  const { readFile, writeFile } = await import('node:fs/promises');

  const nxJsonPath = path.join(workspaceRoot, 'nx.json');
  const content = await readFile(nxJsonPath, 'utf8');
  const nxJson = JSON.parse(content) as Record<string, unknown>;

  const normalizedPluginConfiguration: Record<string, unknown> =
    typeof configuration === 'string'
      ? { plugin: configuration }
      : {
          plugin: configuration.plugin,
          ...(configuration.options && { options: configuration.options }),
        };

  const updatedNxJson = {
    ...nxJson,
    plugins: [
      ...((nxJson['plugins'] as unknown[]) ?? []),
      normalizedPluginConfiguration,
    ],
  };

  await writeFile(nxJsonPath, JSON.stringify(updatedNxJson, null, 2));
}

/**
 * Runs `nx show project <project> --json` and returns the parsed project configuration.
 * This is a helper for e2e tests to verify project configuration after plugin execution.
 *
 * @param workspaceRoot - Full path to the workspace root
 * @param projectName - Name of the project to show
 * @returns Object with code (exit code) and projectJson (parsed project configuration)
 *
 * @example
 * ```ts
 * const { code, projectJson } = await nxShowProjectJson(testDir, 'my-lib');
 * expect(projectJson['targets']).toBeDefined();
 * ```
 */
export async function nxShowProjectJson(
  workspaceRoot: string,
  projectName: string
): Promise<{
  code: number | null;
  projectJson: Record<string, unknown>;
  error?: { message: string; stderr?: string; stdout?: string };
}> {
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');

  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync(
      `npx nx show project ${projectName} --json`,
      { cwd: workspaceRoot }
    );
    const projectJson = JSON.parse(stdout) as Record<string, unknown>;
    return { code: 0, projectJson, error: { message: '' } };
  } catch (error: unknown) {
    const execError = error as {
      message?: string;
      stderr?: string;
      stdout?: string;
    };
    return {
      code: 1,
      projectJson: {},
      error: {
        message: execError.message ?? 'Unknown error',
        stderr: execError.stderr,
        stdout: execError.stdout,
      },
    };
  }
}
