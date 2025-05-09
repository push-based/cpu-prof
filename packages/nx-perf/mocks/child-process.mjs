// Create a large array to generate some CPU activity
function createArray(length) {
    return new Array(length).fill(0).map((_, i) => i);
}

const array = [
    ...createArray(1000),
    ...createArray(1000),
    ...createArray(1000)
];

console.log(`PID ${process.pid}; array length: ${array.length}`);