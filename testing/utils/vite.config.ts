/// <reference types='vitest' />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/testing/testing-utils',
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
    {
      name: 'copy-mjs-files',
      writeBundle() {
        // Copy .mjs files to dist
        mkdirSync(path.join(__dirname, 'dist/lib'), { recursive: true });
        copyFileSync(
          path.join(__dirname, 'src/lib/execute-process.mock.mjs'),
          path.join(__dirname, 'dist/lib/execute-process.mock.mjs')
        );
      },
    },
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    copyPublicDir: false,
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.ts',
      name: 'testing-utils',
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es'],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: [/^node:.*/],
    },
  },
});
