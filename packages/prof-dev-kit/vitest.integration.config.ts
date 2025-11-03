import { defineConfig } from 'vitest/config';
import { searchForWorkspaceRoot } from 'vite';
import { createSharedIntegrationVitestConfig } from '../../testing/vitest-setup/src/lib/configuration';

export default defineConfig(() => {
  const baseConfig = createSharedIntegrationVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  const workspaceRoot = searchForWorkspaceRoot(process.cwd());

  return {
    ...baseConfig,
    plugins: [],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    server: {
      fs: {
        allow: [
          workspaceRoot,
          // If your @push-based/testing-utils is outside the detected workspace root for some reason,
          // you might need to add its path explicitly, e.g., join(workspaceRoot, 'testing')
          // For now, relying on searchForWorkspaceRoot which should cover it.
        ],
      },
    },
    test: {
      ...baseConfig.test,
      setupFiles: ['../../testing/setup/src/reset.setup-file.ts'],
      coverage: {
        ...baseConfig.test.coverage,
        exclude: [
          ...baseConfig.test.coverage.exclude,
          'src/bin/**',
          'src/cli/commands/trace-reduce/**',
        ],
      },
    },
  };
});
