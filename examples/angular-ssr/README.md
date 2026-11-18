# Angular SSR profiling demo

One Chrome DevTools trace of one server-side rendered request: the **Node SSR server** (CPU
profile) and the **browser** (Chrome performance trace), on one timeline.

Built for the talk "Every Process, One Flame Chart". Angular 22, SSR at request time
(`RenderMode.Server`), zoneless.

## Run it

```bash
nvm use               # Node 24 (Angular 22 needs ^22.22.3 or ^24.15)
npm install
npm run profile       # development build, then scripts/profile.mjs
```

Then drag `profiles/ssr-and-browser.trace.json` into Chrome DevTools → Performance and search
for `computePrimes`.

## What `npm run profile` does

1. Starts the SSR server with `NODE_OPTIONS="--cpu-prof --cpu-prof-dir=<abs>/profiles"`.
   `scripts/exit-on-signal.mjs` (loaded with `--import`) turns SIGINT into a normal exit, because
   Node writes the profile only on exit.
2. Opens `http://localhost:4000/` in your installed Chrome via Playwright, with tracing on
   (`browser.startTracing`), and saves `profiles/browser.trace.json`.
3. Stops the server: `profiles/CPU.….cpuprofile` is written.
4. `cpu-prof merge` turns the Node profiles into trace events, and the script adds them to the
   browser trace. Node and Chrome use the same OS monotonic clock, so nothing is shifted.

DevTools shows only the page's renderer process once a trace contains `TracingStartedInBrowser`.
So the Node lanes move into that process as their own thread track,
**"Node · Angular SSR server (pid …)"**, right under the browser's Main thread. Insights, LCP and
network stay as in a normal recording.

## The work you will see

`src/app/primes.ts` — `computePrimes(60_000)` runs on the server while rendering, and again in the
browser when the app boots. Same function name in both tracks.

The profile run uses the **development** build: a production build minifies function names.

## Notes

- `CHROME_CHANNEL=chromium npm run profile` uses Playwright's Chromium instead of your Chrome
  (needs `npx playwright install chromium`).
- Angular 22's SSR server answers only allow-listed hosts: `NG_ALLOWED_HOSTS=localhost` is set.
- Verified 2026-11-18 on Linux, Node 22.23, Chromium: the Node track renders in DevTools next to
  Main, with the server render before `main.js` is requested.
