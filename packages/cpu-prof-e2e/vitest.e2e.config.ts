import { defineConfig } from 'vitest/config';
import { createSharedE2eVitestConfig } from '@push-based/testing-vitest-setup';
import path from 'path';

export default defineConfig(() => {
  const baseConfig = createSharedE2eVitestConfig({
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
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // }
  };
});
