import { defineConfig } from 'vitest/config';
import { createSharedUnitVitestConfig } from '../vitest-setup/src/lib/configuration';

export default defineConfig(() => {
  const baseConfig = createSharedUnitVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/testing-utils',
    plugins: [],
    test: {
      ...baseConfig.test,
    },
  };
});
