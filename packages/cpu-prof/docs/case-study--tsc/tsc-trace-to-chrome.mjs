#!/usr/bin/env node
/**
 * Convert a TypeScript `tsc --generateTrace <dir>` output (trace.json + types.json)
 * into a trace file that loads cleanly in the Chrome DevTools Performance panel.
 *
 * What it does:
 *  - Streams trace.json / types.json line by line (tsc writes one record per line),
 *    so it tolerates truncated files (e.g. tsc killed before the closing `]`).
 *  - Pairs B/E events into X (complete) events. Unclosed B events are closed at
 *    the end of the trace and flagged with `args.unfinished: true`.
 *  - Gives instant events a scope (`s: "t"`) so DevTools draws them.
 *  - Drops tsc's TracingStartedInBrowser marker so DevTools treats the file as a
 *    generic trace and draws every event (in Chrome-page mode it hides unknown names).
 *  - Resolves type IDs (sourceId/targetId/id and *IdStack) from types.json into
 *    readable labels (e.g. `Partial<…> #60000 (lib.es5.d.ts:1580)`).
 *  - Optionally appends the file name to per-file events (`--file-names`).
 *
 * Usage:
 *   node tsc-trace-to-chrome.mjs [traceDir | trace.json] [options]
 *
 * Options:
 *   -o, --out <file>     Output file (default: <traceDir>/trace.chrome.json)
 *   --types <file>       types.json path (default: next to trace.json)
 *   --no-types           Skip type resolution (much faster, less memory)
 *   --file-names         Append the source file name to event names
 *                        (nicer flame chart, worse Bottom-up aggregation)
 *   --root <prefix>      Strip this path prefix from paths in args
 *                        (default: auto-detected common prefix)
 *   --min-dur <µs>       Drop complete events shorter than this (default: 0)
 *   -h, --help
 */
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { basename, dirname, join, resolve } from 'node:path';

const PID = 1;
const TID = 1;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = { input: '.', out: undefined, types: undefined, useTypes: true, fileNames: false, root: undefined, minDur: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-o':
      case '--out': opts.out = argv[++i]; break;
      case '--types': opts.types = argv[++i]; break;
      case '--no-types': opts.useTypes = false; break;
      case '--file-names': opts.fileNames = true; break;
      case '--root': opts.root = argv[++i]; break;
      case '--min-dur': opts.minDur = Number(argv[++i]); break;
      case '-h':
      case '--help':
        console.log(readHelp());
        process.exit(0);
      default:
        if (a.startsWith('-')) throw new Error(`Unknown option ${a}`);
        opts.input = a;
    }
  }
  const inputPath = resolve(opts.input);
  const tracePath = existsSync(inputPath) && statSync(inputPath).isDirectory() ? join(inputPath, 'trace.json') : inputPath;
  const dir = dirname(tracePath);
  return {
    ...opts,
    tracePath,
    typesPath: opts.types ? resolve(opts.types) : join(dir, 'types.json'),
    outPath: opts.out ? resolve(opts.out) : join(dir, 'trace.chrome.json'),
  };
}

function readHelp() {
  return `Usage: node ${basename(process.argv[1])} [traceDir | trace.json] [-o out.json] [--types types.json] [--no-types] [--file-names] [--root <prefix>] [--min-dur <µs>]`;
}

// ---------------------------------------------------------------------------
// Line-based JSON array reader (tolerates truncation)
// ---------------------------------------------------------------------------
async function* readJsonArrayLines(path) {
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  let skipped = 0;
  for await (let line of rl) {
    line = line.trim();
    if (line.startsWith('[')) line = line.slice(1);
    if (line.endsWith(']')) line = line.slice(0, -1);
    if (line.endsWith(',')) line = line.slice(0, -1);
    if (!line) continue;
    try {
      yield JSON.parse(line);
    } catch {
      skipped++;
    }
  }
  if (skipped) console.warn(`  ! skipped ${skipped} unparsable line(s) in ${basename(path)} (truncated file?)`);
}

// ---------------------------------------------------------------------------
// types.json -> id => label
// ---------------------------------------------------------------------------
async function loadTypes(path) {
  /** @type {Map<number, object>} */
  const raw = new Map();
  for await (const t of readJsonArrayLines(path)) {
    // keep only what we need for labels to save memory
    raw.set(t.id, {
      symbolName: t.symbolName,
      intrinsicName: t.intrinsicName,
      isTuple: t.isTuple,
      display: t.display,
      value: t.value,
      flags: t.flags,
      unionTypes: t.unionTypes,
      intersectionTypes: t.intersectionTypes,
      typeArguments: t.typeArguments ?? t.aliasTypeArguments,
      aliasName: t.aliasName ?? undefined,
      instantiatedType: t.instantiatedType,
      loc: t.firstDeclaration ?? t.referenceLocation ?? t.destructuringPattern,
    });
  }
  return raw;
}

function makeTypeLabeler(types, shortenPath) {
  const cache = new Map();
  const MAX = 160;

  function baseName(id, hops = 0) {
    const t = types.get(id);
    if (!t) return `#${id}`;
    if (t.symbolName && t.symbolName !== '__type') return t.symbolName;
    if (t.aliasName) return t.aliasName;
    if (t.instantiatedType && t.instantiatedType !== id && hops < 5) return baseName(t.instantiatedType, hops + 1);
    if (t.flags?.includes('TypeParameter')) return 'T';
    if (t.symbolName === '__type') return '{…}';
    return t.flags?.[0] ?? 'type';
  }

  function name(id, depth) {
    const t = types.get(id);
    if (!t) return `#${id}`;
    if (t.display) return t.display;
    if (t.intrinsicName) return t.intrinsicName;
    if (t.value !== undefined) return JSON.stringify(t.value);
    if (depth > 2) return baseName(id);
    if (t.unionTypes) return joinTypes(t.unionTypes, ' | ', depth);
    if (t.intersectionTypes) return joinTypes(t.intersectionTypes, ' & ', depth);
    const args = t.typeArguments ?? [];
    const argList = () => args.slice(0, 4).map((a) => name(a, depth + 1)).join(', ') + (args.length > 4 ? ', …' : '');
    if (t.isTuple) return `[${argList()}]`;
    const base = baseName(id);
    return args.length ? `${base}<${argList()}>` : base;
  }

  function joinTypes(ids, sep, depth) {
    const parts = ids.slice(0, 6).map((i) => name(i, depth + 1));
    if (ids.length > 6) parts.push(`… +${ids.length - 6}`);
    return parts.join(sep);
  }

  return function label(id) {
    if (typeof id !== 'number') return id;
    let l = cache.get(id);
    if (l) return l;
    const t = types.get(id);
    l = name(id, 0);
    if (l.length > MAX) l = l.slice(0, MAX - 1) + '…';
    l += ` #${id}`;
    if (t?.loc?.path) l += ` (${shortenPath(t.loc.path)}:${t.loc.start?.line ?? '?'})`;
    cache.set(id, l);
    return l;
  };
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------
function commonPrefix(paths) {
  if (!paths.length) return '';
  let prefix = paths[0].toLowerCase();
  for (const p of paths) {
    const lp = p.toLowerCase();
    let i = 0;
    while (i < prefix.length && i < lp.length && prefix[i] === lp[i]) i++;
    prefix = prefix.slice(0, i);
    if (!prefix) break;
  }
  return prefix.slice(0, prefix.lastIndexOf('/') + 1);
}

function makePathShortener(root) {
  if (!root) return (p) => p;
  const lroot = root.toLowerCase();
  return (p) => (typeof p === 'string' && p.toLowerCase().startsWith(lroot) ? p.slice(root.length) : p);
}

const PATH_KEYS = ['path', 'fileName', 'containingFileName', 'configFilePath', 'refPath', 'resolveFrom'];

// ---------------------------------------------------------------------------
// Main conversion
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!existsSync(opts.tracePath)) throw new Error(`trace file not found: ${opts.tracePath}\n${readHelp()}`);

  console.log(`Reading ${opts.tracePath}`);
  const raw = [];
  for await (const e of readJsonArrayLines(opts.tracePath)) raw.push(e);
  console.log(`  ${raw.length} events`);

  // Detect root for shortening paths (only from paths outside node_modules)
  let root = opts.root;
  if (root === undefined) {
    const sample = [];
    for (const e of raw) {
      const p = e.args?.path ?? e.args?.configFilePath;
      // only real absolute paths (tsc also reports virtual files like /dummy.ts)
      if (typeof p === 'string' && p.split('/').length > 4 && !p.includes('/node_modules/')) sample.push(p);
      if (sample.length > 2000) break;
    }
    root = commonPrefix(sample);
  }
  const shortenPath = makePathShortener(root);
  if (root) console.log(`  stripping path prefix: ${root}`);

  let labelType;
  if (opts.useTypes && existsSync(opts.typesPath)) {
    console.log(`Reading ${opts.typesPath}`);
    const types = await loadTypes(opts.typesPath);
    console.log(`  ${types.size} types`);
    labelType = makeTypeLabeler(types, shortenPath);
  } else if (opts.useTypes) {
    console.warn(`  ! ${opts.typesPath} not found, skipping type resolution`);
  }

  const out = [];
  const stacks = new Map(); // `${pid}:${tid}` -> B events
  let minTs = Infinity;
  let maxTs = -Infinity;
  let unmatchedE = 0;
  let dropped = 0;

  const finish = (ev) => {
    if (ev.ph === 'X' && ev.dur < opts.minDur) {
      dropped++;
      return;
    }
    out.push(enrich(ev));
  };

  function enrich(ev) {
    const args = ev.args ? { ...ev.args } : {};
    for (const k of PATH_KEYS) if (typeof args[k] === 'string') args[k] = shortenPath(args[k]);
    if (labelType) {
      if ('sourceId' in args) args.sourceType = labelType(args.sourceId);
      if ('targetId' in args) args.targetType = labelType(args.targetId);
      if ('id' in args && typeof args.id === 'number') args.type = labelType(args.id);
      if (Array.isArray(args.sourceIdStack)) args.sourceTypeStack = args.sourceIdStack.map(labelType);
      if (Array.isArray(args.targetIdStack)) args.targetTypeStack = args.targetIdStack.map(labelType);
    }
    let name = ev.name;
    if (opts.fileNames) {
      const file = args.path ?? args.fileName;
      if (typeof file === 'string') name = `${ev.name} ${basename(file)}`;
    }
    return { ...ev, name, pid: PID, tid: TID, args };
  }

  for (const e of raw) {
    if (e.ph === 'M' || e.name === 'TracingStartedInBrowser') continue; // dropped: must stay a generic trace (see header)
    if (typeof e.ts === 'number') {
      minTs = Math.min(minTs, e.ts);
      maxTs = Math.max(maxTs, e.ts + (e.dur ?? 0));
    }
    const key = `${e.pid}:${e.tid}`;
    switch (e.ph) {
      case 'B': {
        if (!stacks.has(key)) stacks.set(key, []);
        stacks.get(key).push(e);
        break;
      }
      case 'E': {
        const stack = stacks.get(key) ?? [];
        // find the matching B (normally the top of the stack)
        let idx = stack.length - 1;
        while (idx >= 0 && stack[idx].name !== e.name) idx--;
        if (idx < 0) {
          unmatchedE++;
          break;
        }
        // anything above it was never closed -> close it here
        while (stack.length - 1 > idx) closeUnfinished(stack.pop(), e.ts);
        const b = stack.pop();
        finish({ ...b, ph: 'X', dur: e.ts - b.ts, args: { ...b.args, ...e.args } });
        break;
      }
      case 'i':
      case 'I':
        finish({ ...e, ph: 'I', s: 't' }); // thread scope: keeps markers on the Main track
        break;
      default:
        finish(e);
    }
  }

  function closeUnfinished(b, endTs) {
    finish({ ...b, ph: 'X', dur: endTs - b.ts, args: { ...b.args, unfinished: true } });
  }
  let unfinished = 0;
  for (const stack of stacks.values()) {
    while (stack.length) {
      closeUnfinished(stack.pop(), maxTs);
      unfinished++;
    }
  }

  // Keep the trace *generic*. Any Chrome-page marker (TracingStartedInBrowser,
  // TracingStartedInPage, CpuProfile, ...) flips DevTools into "web page" mode,
  // where the Main track only draws event names it knows (RunTask, FunctionCall, ...)
  // and hides everything else -> all tsc events would be invisible.
  const configFile = raw.find((e) => e.args?.configFilePath)?.args.configFilePath;
  const header = [
    { cat: '__metadata', name: 'process_name', ph: 'M', pid: PID, tid: TID, ts: 0, args: { name: configFile ? `tsc ${shortenPath(configFile)}` : 'tsc' } },
    { cat: '__metadata', name: 'thread_name', ph: 'M', pid: PID, tid: TID, ts: 0, args: { name: 'tsc main' } },
  ];

  // Sort by ts; on ties, longer (parent) events first so nesting is correct.
  out.sort((a, b) => a.ts - b.ts || (b.dur ?? 0) - (a.dur ?? 0));

  await writeTrace(opts.outPath, [...header, ...out], {
    source: 'tsc --generateTrace',
    convertedBy: basename(process.argv[1]),
    pathRoot: root || undefined,
    startTime: new Date().toISOString(),
  });

  console.log(`Wrote ${opts.outPath}`);
  console.log(`  ${header.length + out.length} events, span ${((maxTs - minTs) / 1e6).toFixed(2)}s`);
  if (unmatchedE) console.warn(`  ! ${unmatchedE} E event(s) without matching B were dropped`);
  if (unfinished) console.warn(`  ! ${unfinished} B event(s) never ended; closed at trace end (args.unfinished)`);
  if (dropped) console.log(`  dropped ${dropped} event(s) shorter than ${opts.minDur}µs`);
  console.log('Open it in Chrome DevTools > Performance > "Load profile…"');
}

// Write streaming so large traces don't hit the max string length.
function writeTrace(path, events, metadata) {
  return new Promise((res, rej) => {
    const ws = createWriteStream(path, 'utf8');
    ws.on('error', rej);
    ws.on('finish', res);
    let i = 0;
    ws.write(`{"metadata":${JSON.stringify(metadata)},\n"traceEvents":[\n`);
    const pump = () => {
      while (i < events.length) {
        const chunk = JSON.stringify(events[i]) + (i < events.length - 1 ? ',\n' : '\n');
        i++;
        if (!ws.write(chunk)) return ws.once('drain', pump);
      }
      ws.end(']}\n');
    };
    pump();
  });
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
