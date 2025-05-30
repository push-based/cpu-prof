export interface SharedVitestConfigOptions {
  projectRoot: string;
  workspaceRoot: string;
  environment?: 'node' | 'jsdom' | 'happy-dom';
  include?: string[];
  exclude?: string[];
  testTimeout?: number;
}

export function createSharedVitestConfig(options: SharedVitestConfigOptions) {
  const {
    projectRoot,
    workspaceRoot,
    environment = 'node',
    include = ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude = ['mocks/**', '**/types.ts', '**/__snapshots__/**'],
    testTimeout = 25_000,
  } = options;

  // Simple path joining for Node.js
  const projectName = projectRoot.split('/').slice(-2).join('-'); // e.g., "shared-utils"
  const coverageDir = `${workspaceRoot}/coverage/${projectName}`;

  return {
    test: {
      coverage: {
        provider: 'v8' as const,
        reporter: ['text', 'lcov'] as const,
        reportsDirectory: coverageDir,
        exclude,
      },
      watch: false,
      globals: true,
      environment,
      include,
      reporters: ['default'] as const,
      passWithNoTests: true,
      testTimeout,
    },
  };
}
