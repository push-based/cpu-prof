import { defineConfig } from 'vitest/config';
import { createSharedUnitVitestConfig } from '../../testing/vitest-setup/src/lib/configuration';

export default defineConfig(() => {
  const baseConfig = createSharedUnitVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  return {
    ...baseConfig,
    plugins: [],
    test: {
      ...baseConfig.test,
      setupFiles: [
        '../../testing/vitest-setup/src/lib/fs-memfs.setup-file.ts',
        '../../testing/setup/src/reset.setup-file.ts',
      ],
      coverage: {
        ...baseConfig.test.coverage,
        exclude: [
          ...baseConfig.test.coverage.exclude,
          'src/cli/commands/trace-reduce/**',
        ],
      },
    },
  };
});
