import { defineConfig } from 'vitest/config';
import { createSharedE2eVitestConfig } from '../../testing/vitest-setup/src/lib/configuration';

export default defineConfig(() => {
  const baseConfig = createSharedE2eVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  return {
    ...baseConfig,
    root: __dirname,
    cacheDir: '../../node_modules/.vite/packages/cpu-profiling',
    plugins: [],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // }
  };
});
