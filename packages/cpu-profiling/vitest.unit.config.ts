import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/cpu-profiling',
  plugins: [],
  test: {
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.unit.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    setupFiles: [
      '../../testing/vitest-setup/src/lib/fs-memfs.setup-file.ts',
      '../../testing/setup/src/reset.setup-file.ts',
    ],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/cpu-profiling/unit',
      provider: 'v8' as const,
      include: ['src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: [
        'src/**/__snapshots__/**',
        'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        'src/**/index.ts',
      ],
    },
  },
}));
