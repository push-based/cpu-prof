import { defineConfig } from 'vitest/config';
import { createSharedIntegrationVitestConfig } from '../../testing/vitest-setup/src/lib/configuration';

export default defineConfig(() => {
  const baseConfig = createSharedIntegrationVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  return {
    ...baseConfig,
    plugins: [],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
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
