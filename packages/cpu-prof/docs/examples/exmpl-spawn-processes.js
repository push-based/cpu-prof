import { spawn } from 'node:child_process';
import { threadId as t } from 'node:worker_threads';
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// normally this folders exist as the location of the executed script is in that folder.
mkdirSync(join(process.cwd(), 'child-process-1'), { recursive: true });
mkdirSync(join(process.cwd(), 'child-process-2'), { recursive: true });

const childScriptPath = join(__dirname, 'exmpl-script.js');

spawn(process.execPath, [childScriptPath], { stdio: 'inherit', cwd: join(process.cwd(), 'child-process-1') });
spawn(process.execPath, [childScriptPath], { stdio: 'inherit' , cwd: join(process.cwd(), 'child-process-2') });

console.log('Parent PID:' , process.pid, 'TID:', t);
