console.log(`PID ${process.pid}; Starting heavy computations`);

function heavyWork(size) {
    let result = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            result += Math.sin(i) * Math.cos(j);
        }
    }
    return result;
}

let tickCount = 1;
for (let i = 0; i < 3; i++) {
    const result = heavyWork(1000);
    console.log(`PID ${process.pid}; Tick ${tickCount}, Round ${i + 1} completed:`, {
        result
    });
}

console.log(`PID ${process.pid}; All ticks completed`);
