#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { main } from './core/main';

export { main } from './core/main';
export { commands, reduceTraceCommand } from './core/commands';
export * from './utils';
