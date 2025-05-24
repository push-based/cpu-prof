const {withNx} = require('@nx/rollup/with-nx');



module.exports = withNx(
    {
        main: './src/index.ts',
        additionalEntryPoints: [
            './src/bin/profiling.ts',
        ],
        outputPath: './dist',
        tsConfig: './tsconfig.lib.json',
        compiler: 'swc',
        format: ['esm', 'cjs'],
        assets: [
            { input: './packages/cpu-profiling', glob: './package.json', output: '.' },
            { input: './packages/cpu-profiling', glob: './README.md', output: '.' },
            { input: './packages/cpu-profiling', glob: './docs/*', output: './docs' }
        ],
    },
    {
        // Provide additional rollup configuration here. See: https://rollupjs.org/configuration-options
        // e.g.
        // output: { sourcemap: true },
    }
);
