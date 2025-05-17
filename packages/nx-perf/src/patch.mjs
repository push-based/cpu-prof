import * as cp from 'node:child_process';

const originalSpawn = cp.spawn;

function patchedSpawn(command, args = [], options = {}) {
    if (typeof command === 'string' && command.includes('node')) {
        if (!Array.isArray(args)) args = [];
        if (!args.includes('--cpu-prof')) {
            args.unshift('--cpu-prof');
        }
    }

    return originalSpawn(command, args, options);
}

// Define a global proxy to override spawn for code that uses global references
globalThis.__patchedSpawn = patchedSpawn;

// Optionally warn so you know it’s applied
console.warn('[patch] spawn patched with --cpu-prof injection');
