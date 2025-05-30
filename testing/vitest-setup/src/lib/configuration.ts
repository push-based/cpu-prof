export interface SharedVitestConfigOptions {
  enabled?: boolean;
  projectRoot: string;
  workspaceRoot: string;
  environment?: 'node' | 'jsdom' | 'happy-dom';
  include?: string[];
  exclude?: string[];
  testTimeout?: number;
}

function createSharedVitestConfig(
  options: SharedVitestConfigOptions,
  testType: 'unit' | 'integration' | 'e2e',
  defaultTimeout: number
) {
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

  return {
    test: {
      coverage: enabled
        ? {
            provider: 'v8' as 'v8',
            reporter: ['text', 'lcov'] as ('text' | 'lcov')[],
            reportsDirectory: coverageDir,
            include: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
            exclude,
          }
        : { enabled: false, exclude: [], include: [] },
      watch: false,
      globals: true,
      environment,
      include,
      reporters: ['default'] as 'default'[],
      passWithNoTests: true,
      testTimeout,
    },
  };
}

export function createSharedUnitVitestConfig(
  options: SharedVitestConfigOptions
) {
  return createSharedVitestConfig(options, 'unit', 5_000);
}

export function createSharedIntegrationVitestConfig(
  options: SharedVitestConfigOptions
) {
  return createSharedVitestConfig(options, 'integration', 15_000);
}

export function createSharedE2eVitestConfig(
  options: SharedVitestConfigOptions
) {
  return createSharedVitestConfig(options, 'e2e', 30_000);
}
