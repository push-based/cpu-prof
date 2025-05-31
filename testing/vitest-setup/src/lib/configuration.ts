export interface SharedVitestConfigOptions {
  enabled?: boolean;
  projectRoot: string;
  workspaceRoot: string;
  environment?: 'node' | 'jsdom' | 'happy-dom';
  include?: string[];
  exclude?: string[];
  testTimeout?: number;
}

// Define a unified coverage config interface
interface CoverageConfig {
  enabled?: boolean;
  provider: 'v8';
  reporter: ('text' | 'lcov')[];
  reportsDirectory: string;
  include: string[];
  exclude: string[];
}

interface SharedVitestConfig {
  root: string;
  cacheDir: string;
  test: {
    coverage: CoverageConfig;
    watch: boolean;
    globals: boolean;
    environment: 'node' | 'jsdom' | 'happy-dom';
    include: string[];
    reporters: 'default'[];
    passWithNoTests: boolean;
    testTimeout: number;
  };
}

function createSharedVitestConfig(
  options: SharedVitestConfigOptions,
  testType: 'unit' | 'integration' | 'e2e',
  defaultTimeout: number
): SharedVitestConfig {
  const {
    enabled = true,
    projectRoot,
    workspaceRoot,
    environment = 'node',
    include = [`src/**/*.${testType}.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`],
    exclude = [
      'mocks/**',
      '**/types.ts',
      '**/__snapshots__/**',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/index.ts',
    ],
    testTimeout = defaultTimeout,
  } = options;

  const projectName = projectRoot.split('/').slice(-2).join('-'); // e.g., "shared-utils"
  const coverageDir = `${workspaceRoot}/coverage/${projectName}/${testType}`;
  const cacheDir = `${workspaceRoot}/node_modules/.vite/${projectName}`;

  const coverage: CoverageConfig = {
    enabled,
    provider: 'v8',
    reporter: ['text', 'lcov'],
    reportsDirectory: coverageDir,
    include: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude,
  };

  return {
    root: projectRoot,
    cacheDir,
    test: {
      coverage,
      watch: false,
      globals: true,
      environment,
      include,
      reporters: ['default'],
      passWithNoTests: true,
      testTimeout,
    },
  };
}

export function createSharedUnitVitestConfig(
  options: SharedVitestConfigOptions
): SharedVitestConfig {
  return createSharedVitestConfig(options, 'unit', 5_000);
}

export function createSharedIntegrationVitestConfig(
  options: SharedVitestConfigOptions
): SharedVitestConfig {
  return createSharedVitestConfig(options, 'integration', 15_000);
}

export function createSharedE2eVitestConfig(
  options: SharedVitestConfigOptions
): SharedVitestConfig {
  return createSharedVitestConfig(options, 'e2e', 30_000);
}
