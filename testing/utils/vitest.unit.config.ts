import { defineConfig } from 'vitest/config';
import { createSharedUnitVitestConfig } from '@push-based/testing-vitest-setup';

export default defineConfig(() => {
  const baseConfig = createSharedUnitVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  return {
    ...baseConfig,
    plugins: [],
  };
});
