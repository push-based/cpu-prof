#!/usr/bin/env node

// Simple mock process for CPU profiling tests
// Does some CPU work to ensure we get meaningful profile data

const args = process.argv.slice(2);
const command = args[0] || 'default';

// Simulate different command behaviors
switch (command) {
  case '--version':
    console.log('mock-command v1.0.0');
    break;
  case 'config':
    if (args[1] === 'get' && args[2] === 'registry') {
      console.log('https://registry.npmjs.org/');
    }
    break;
  case 'hello':
    if (args[1] === 'world') {
      console.log('hello world');
    }
    break;
  default:
    console.log(`Mock process executed with args: ${args.join(' ')}`);
}

// Do some CPU work to generate profile data
let sum = 0;
const iterations = 100000;

for (let i = 0; i < iterations; i++) {
  sum += Math.sqrt(i) * Math.sin(i) + Math.cos(i);
  
  // Add some nested function calls to create interesting call stacks
  if (i % 1000 === 0) {
    performNestedWork(i);
  }
}

function performNestedWork(value) {
  return calculateSomething(value) + doMoreCalculation(value);
}

function calculateSomething(x) {
  let result = 0;
  for (let i = 0; i < 100; i++) {
    result += x * Math.random();
  }
  return result;
}

function doMoreCalculation(x) {
  return Array.from({ length: 50 }, (_, i) => x + i).reduce((a, b) => a + b, 0);
}

console.log(`CPU work completed. Sum: ${sum.toFixed(2)}`);
process.exit(0);
