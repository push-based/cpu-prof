#!/usr/bin/env node

import main from '../cli/core/main';

main().catch((error) => {
  console.error('CLI Error:', (error as Error).message);
  process.exit(1);
});
