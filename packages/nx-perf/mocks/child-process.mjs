// Heavy computation that's easy to understand
function heavyWork(size) {
    let result = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            result += Math.sin(i) * Math.cos(j);
        }
    }
    return result;
}

async function executeHeavyComputations() {
    console.log(`PID ${process.pid}; Starting heavy computations`);
    
    let tickCount = 0;

    const executeTick = () => {
        tickCount++;
        console.log(`PID ${process.pid}; Tick ${tickCount}`);
        
        // Three rounds of computation per tick
        for (let i = 0; i < 3; i++) {
            const result = heavyWork(1000);
            console.log(`PID ${process.pid}; Tick ${tickCount}, Round ${i + 1} completed:`, {
                result
            });
        }

        if (tickCount >= 3) {
            clearInterval(interval);
            console.log(`PID ${process.pid}; All ticks completed`);
        }
    };

    // Execute first tick immediately
    executeTick();

    // Schedule remaining ticks
    const interval = setInterval(executeTick, 100);
}

executeHeavyComputations().catch(console.error);
