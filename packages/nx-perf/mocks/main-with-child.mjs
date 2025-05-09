import { fork } from "child_process";
import { join, dirname } from "path";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const numChildren = parseInt(process.argv[2], 10) || 2;
const childScript = join(__dirname, 'child-process.mjs');

// Get CPU profile directory from parent process
const cpuProfDir = process.execArgv.find(arg => arg.startsWith('--cpu-prof-dir=')).split('=')[1];

console.log(`PID ${process.pid}; spawning ${numChildren} children, 3 times each at 100ms intervals`);

// Track active children
const activeChildren = new Set();
let forksPerChild = new Map();

// Create a child process with CPU profiling enabled
function spawnChild(childIndex) {
    const child = fork(childScript, [], {
        execArgv: [
            '--cpu-prof',
            `--cpu-prof-dir=${cpuProfDir}`
        ],
        stdio: ['inherit', 'pipe', 'pipe', 'ipc']
    });

    activeChildren.add(child);
    const currentForks = forksPerChild.get(childIndex) || 0;
    forksPerChild.set(childIndex, currentForks + 1);

    child.stdout?.on('data', (data) => {
        process.stdout.write(`Child ${childIndex} (fork ${currentForks + 1}): ${data}`);
    });

    child.stderr?.on('data', (data) => {
        process.stderr.write(`Child ${childIndex} (fork ${currentForks + 1}) error: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`Child process ${childIndex} (fork ${currentForks + 1}) exited with code ${code}`);
        activeChildren.delete(child);

        // If all children are done, exit
        if (activeChildren.size === 0 && Array.from(forksPerChild.values()).every(count => count >= 3)) {
            console.log('All processes completed');
            process.exit(0);
        }
    });

    child.on('error', (err) => {
        console.error(`Child ${childIndex} (fork ${currentForks + 1}) error:`, err);
        activeChildren.delete(child);
    });

    // Kill the child after a short time
    setTimeout(() => {
        if (activeChildren.has(child)) {
            child.kill();
        }
    }, 50);

    // Schedule next fork if we haven't done 3 yet
    if (currentForks + 1 < 3) {
        setTimeout(() => {
            spawnChild(childIndex);
        }, 100);
    }
}

// Start initial set of children
for (let i = 0; i < numChildren; i++) {
    spawnChild(i);
}

// Safety timeout to ensure we eventually exit
setTimeout(() => {
    // Kill any remaining children
    if (activeChildren.size > 0) {
        console.log('Terminating remaining children');
        for (const child of activeChildren) {
            child.kill();
        }
    }
    console.log('All processes completed');
    process.exit(0);
}, 1000); // 1 second should be enough for 3 forks at 100ms intervals

