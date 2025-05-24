#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { main } from '../cli/index';

// Only run if this file is executed directly (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const isMainModule =
  process.argv[1] === __filename || process.argv[1].endsWith(__filename);

if (isMainModule) {
  main().catch((error) => {
    console.error('CLI Error:', (error as Error).message);
    process.exit(1);
  });
}
