import { parentPort, threadId, isMainThread } from 'worker_threads';

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
    const id = isMainThread ? process.pid : threadId;
    console.log(`Thread ${id}; Starting heavy computations`);
    
    let tickCount = 0;

    const executeTick = () => {
        tickCount++;
        console.log(`Thread ${id}; Tick ${tickCount}`);
        
        // Three rounds of computation per tick
        for (let i = 0; i < 3; i++) {
            const result = heavyWork(1000);
            console.log(`Thread ${id}; Tick ${tickCount}, Round ${i + 1} completed:`, {
                result
            });
        }

        if (tickCount >= 3) {
            clearInterval(interval);
            console.log(`Thread ${id}; All ticks completed`);
            if (parentPort) {
                parentPort.close();
            }
        }
    };

    // Execute first tick immediately
    executeTick();

    // Schedule remaining ticks
    const interval = setInterval(executeTick, 100);
}

executeHeavyComputations().catch(console.error);
