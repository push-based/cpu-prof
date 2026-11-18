// Profile one Angular SSR request end to end and merge it into one Chrome DevTools trace:
//   the Node SSR server (CPU profile per process/thread) + the browser (Chrome performance trace).
// Usage: npm run profile   (builds first; see README.md)
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'profiles');
const port = process.env.PORT ?? '4000';
const url = `http://localhost:${port}/`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. The SSR server, profiled. NODE_OPTIONS reaches every process and worker it starts.
const server = spawn(process.execPath, [join(root, 'dist/angular-ssr/server/server.mjs')], {
  env: {
    ...process.env,
    PORT: port,
    NG_ALLOWED_HOSTS: 'localhost', // Angular SSR only answers allow-listed hosts
    NODE_OPTIONS: `--cpu-prof --cpu-prof-dir=${out} --import=${join(root, 'scripts/exit-on-signal.mjs')}`,
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});
process.on('exit', () => server.exitCode === null && server.kill('SIGKILL'));
await new Promise((ok) => server.stdout.on('data', (d) => (process.stdout.write(d), String(d).includes('listening') && ok())));

// 2. The browser, traced. Uses your installed Chrome; set CHROME_CHANNEL=chromium for Playwright's.
const { chromium } = await import('playwright');
const channel = process.env.CHROME_CHANNEL ?? 'chrome';
const browser = await chromium.launch(channel === 'chromium' ? {} : { channel });
const page = await browser.newPage();
await browser.startTracing(page, {
  categories: [
    'devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'blink.user_timing',
    'loading', 'latencyInfo', 'disabled-by-default-v8.cpu_profiler',
  ],
});
console.log('Tracing the browser:', url);
await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
await page.waitForTimeout(1000);
writeFileSync(join(out, 'browser.trace.json'), await browser.stopTracing());
await browser.close();

// 3. Stop the server: the signal handler exits normally, so Node writes the profile.
await new Promise((ok) => { server.on('exit', ok); server.kill('SIGINT'); });

console.log('\nRecorded:', readdirSync(out).join(', '));

// 4. One trace. cpu-prof merges the Node profiles (one lane per process and thread). Then the
//    Node lanes join the browser trace. Node and Chrome share the OS monotonic clock, so the
//    timestamps line up without shifting.
//    DevTools shows only the page's renderer process once a trace has TracingStartedInBrowser, so
//    every Node lane moves into that process as its own named thread track.
execFileSync(join(root, 'node_modules/.bin/cpu-prof'), ['merge', out, '--no-focus-main', '-o', join(out, 'node')], { stdio: 'inherit' });
const events = (file) => { const t = JSON.parse(readFileSync(file, 'utf8')); return Array.isArray(t) ? t : t.traceEvents; };
const browserEvents = events(join(out, 'browser.trace.json'));
const started = browserEvents.find((e) => e.name === 'TracingStartedInBrowser');
const rendererPid = started.args.data.frames[0].processId;
const nodeTrace = readdirSync(join(out, 'node')).find((f) => f.endsWith('.json'));
const lane = (e) => 900_000 + e.pid * 100 + (e.tid ?? 0); // unique, stable track id per Node pid/tid
const nodeEvents = events(join(out, 'node', nodeTrace))
  .filter((e) => !(e.ph === 'M' && e.name === 'process_name'))
  .map((e) => ({
    ...e,
    pid: rendererPid,
    tid: lane(e),
    ...(e.ph === 'M' && e.name === 'thread_name'
      ? { args: { name: `Node · Angular SSR server${e.tid ? ` · worker ${e.tid}` : ''} (pid ${e.pid})` } }
      : {}),
  }));
const combined = join(out, 'ssr-and-browser.trace.json');
writeFileSync(combined, JSON.stringify({ traceEvents: [...browserEvents, ...nodeEvents] }));
console.log(`\nOne trace, server + browser: ${combined}\nDrag it into Chrome DevTools → Performance, search computePrimes.`);
