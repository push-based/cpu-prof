// CPU Profiling Patch Script
// Usage: node --require ./cpu-prof.js -e "console.log('CPU')"

const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
if (nodeVersion > 22) {
    const args = process.argv.slice(2).join(' ');
    console.log(`❌ Node.js ${process.version} detected. This patch is only needed for Node.js v22 and below.`);
    console.log(`💡 For Node.js v23+, use: NODE_OPTIONS="--cpu-prof" node ${args}`);
    process.exit(1);
}

// ---


const { Session } = require('inspector');
const fs = require('fs');
const path = require('path');
const { threadId } = require('worker_threads');

const session = new Session();
session.connect();

console.log('🔍 Starting CPU profiling...');
session.post('Profiler.enable');
session.post('Profiler.start');

process.on('exit', () => {
    console.log('💾 Saving CPU profile...');
    stopProfiler(true);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping profiler...');
    stopProfiler();
});

console.log('✅ CPU profiling patch loaded successfully'); 

// ---

function generateProfileName() {
    const now = new Date().toISOString();
    const date = now.slice(0, 10).replace(/-/g, '');
    const time = now.slice(11, 19).replace(/:/g, '');
    const hash = `${process.pid}${threadId}${Date.now()}`
    .split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0) & a, 0);
    const seq = Math.abs(hash % 1000).toString().padStart(3, '0');
    
    return `CPU.${date}.${time}.${process.pid}.${threadId}.${seq}.cpuprofile`;
}

function saveProfile(profile, isExit = false) {
    const filename = generateProfileName();
    try {
        fs.writeFileSync(path.resolve(filename), JSON.stringify(profile, null, 2));
        console.log(`✅ CPU profile saved: ${filename}`);
        if (!isExit) process.exit(0);
    } catch (err) {
        console.error('❌ Error writing profile:', err);
        if (!isExit) process.exit(1);
    }
}

function stopProfiler(isExit = false) {
    session.post('Profiler.stop', (err, { profile }) => {
        if (err) {
            console.error('❌ Error stopping profiler:', err);
            if (!isExit) process.exit(1);
            return;
        }
        saveProfile(profile, isExit);
    });
}

