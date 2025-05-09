function calculateFibonacciRecursively(n) {
    if (n <= 1) return n;
    return calculateFibonacciRecursively(n - 1) + calculateFibonacciRecursively(n - 2);
}

function performHeavyMatrixMultiplication(size) {
    const matrix1 = Array(size).fill().map(() => Array(size).fill().map(() => Math.random()));
    const matrix2 = Array(size).fill().map(() => Array(size).fill().map(() => Math.random()));
    const result = Array(size).fill().map(() => Array(size).fill(0));
    
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            for (let k = 0; k < size; k++) {
                result[i][j] += matrix1[i][k] * matrix2[k][j];
            }
        }
    }
    return result;
}

function generateLargePrimeFactors(num) {
    const factors = [];
    let n = num;
    
    for (let i = 2; i <= Math.sqrt(num); i++) {
        while (n % i === 0) {
            factors.push(i);
            n = n / i;
        }
    }
    
    if (n > 2) {
        factors.push(n);
    }
    
    return factors;
}

function simulateComplexDataProcessing(arraySize) {
    const data = Array(arraySize).fill().map(() => Math.random() * 1000);
    return data
        .map(performDataTransformation)
        .filter(filterOutliers)
        .reduce(aggregateResults, 0);
}

function performDataTransformation(value) {
    return Math.pow(Math.sin(value) * Math.cos(value), 2) * Math.sqrt(value);
}

function filterOutliers(value) {
    return value > 0.3 && value < 0.7;
}

function aggregateResults(acc, value) {
    return acc + Math.log(value + 1);
}

async function executeHeavyComputations() {
    console.log(`PID ${process.pid}; Starting heavy computations`);
    
    let tickCount = 0;
    const interval = setInterval(() => {
        tickCount++;
        console.log(`PID ${process.pid}; Tick ${tickCount}`);
        
        // Perform multiple rounds of CPU-intensive tasks
        for (let i = 0; i < 3; i++) {
            const fibResult = calculateFibonacciRecursively(30 + tickCount);
            const matrixResult = performHeavyMatrixMultiplication(50 + tickCount * 2);
            const primeFactors = generateLargePrimeFactors(123456789 + tickCount * 1000);
            const processedData = simulateComplexDataProcessing(10000 + tickCount * 1000);
            
            console.log(`PID ${process.pid}; Tick ${tickCount}, Round ${i + 1} completed:`, {
                fibonacciResult: fibResult,
                matrixSize: matrixResult.length,
                numPrimeFactors: primeFactors.length,
                processedDataResult: processedData
            });
        }

        if (tickCount >= 3) {
            clearInterval(interval);
            console.log(`PID ${process.pid}; All ticks completed`);
        }
    }, 100);

    // Keep the process alive longer to ensure multiple profiles
    return new Promise(resolve => {
        setTimeout(resolve, 2000); // Run for 2 seconds to ensure multiple profiles
    });
}

executeHeavyComputations().catch(console.error);
