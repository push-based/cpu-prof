function createArray(length: number) {
    return Array.from({ length }, (_, i) => i);
}
const array = [...createArray(1000), ...createArray(1000), ...createArray(1000)];
console.log(`PID ${process.pid}; array length: ${array.length}`); 