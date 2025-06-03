import { defineConfig } from 'vitest/config';
import { createSharedUnitVitestConfig } from '../../testing/vitest-setup/src/lib/configuration';
import * as path from 'path';

export default defineConfig(() => {
  const baseConfig = createSharedUnitVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  return {
    ...baseConfig,
    plugins: [],
    resolve: {
      alias: {
        '@push-based/testing-utils': path.resolve(
          __dirname,
          '../../testing/utils/src'
        ),
      },
    },
    test: {
      ...baseConfig.test,
      setupFiles: [
        '../../testing/vitest-setup/src/lib/fs-memfs.setup-file.ts',
        '../../testing/setup/src/reset.setup-file.ts',
        '../../testing/setup/src/console.setup-file.ts',
      ],
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
