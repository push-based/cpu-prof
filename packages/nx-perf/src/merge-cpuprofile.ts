import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

interface CallFrame {
  functionName?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface ProfileNode {
  id: number;
  callFrame: CallFrame;
  children?: number[];
}

interface CpuProfile {
  nodes: ProfileNode[];
  startTime: number;
  samples: number[];
  timeDeltas: number[];
}

interface TraceEvent {
  ph: string;
  name: string;
  pid: number;
  tid: number;
  ts: number;
  cat: string;
  args: Record<string, unknown>;
  dur?: number;
}

// Get command line arguments with defaults
const [,, inDir = 'profiles', outDir = 'out'] = process.argv;

// Handle both absolute and relative paths
const inputDir = isAbsolute(inDir) ? inDir : join(process.cwd(), inDir);
const outputDir = isAbsolute(outDir) ? outDir : join(process.cwd(), outDir);
const outputFile = join(outputDir, 'merged-trace.json');

async function mergeProfiles(): Promise<void> {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  const files = (await readdir(inputDir)).filter(f => f.endsWith('.cpuprofile')).sort();

  if (files.length === 0) {
    console.warn(`No .cpuprofile files found in ${inputDir}`);
    return;
  }

  const mergedEvents: TraceEvent[] = [];
  let defaultTid = 10000;

  for (const file of files) {
    const path = join(inputDir, file);
    const content = await readFile(path, 'utf8');
    const profile = JSON.parse(content) as CpuProfile;

    // Extract PID and detect if this is the main thread (.001)
    const pid = parseInt(file.match(/CPU\.\d+\.\d+\.(\d+)\./)?.[1] || '1', 10);
    const seq = file.match(/CPU\.\d+\.\d+\.\d+\.\d+\.(\d+)\.cpuprofile$/)?.[1];
    const isMain = seq === '001';
    const tid = isMain ? 0 : defaultTid++;

    // Metadata for thread
    mergedEvents.push({
      ph: 'M',
      name: 'thread_name',
      pid,
      tid,
      ts: 0,
      cat: '__metadata',
      args: { name: isMain ? 'Main Thread (.001)' : file }
    });

    const nodes = profile.nodes.map(n => ({ ...n }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Build child → parent reverse lookup
    const childToParent = new Map<number, number>();
    for (const node of nodes) {
      for (const child of node.children || []) {
        childToParent.set(child, node.id);
      }
    }

    // Reconstruct stack + emit events
    let ts = profile.startTime * 1000;
    const samples = profile.samples;
    const timeDeltas = profile.timeDeltas;

    for (let i = 0; i < samples.length; i++) {
      const nodeId = samples[i];
      const dur = timeDeltas[i] * 1000;

      const stack: ProfileNode[] = [];
      let currentId: number | undefined = nodeId;
      const seen = new Set<number>();

      while (currentId !== undefined && !seen.has(currentId)) {
        seen.add(currentId);
        const node = nodeMap.get(currentId);
        if (node) stack.unshift(node);
        currentId = childToParent.get(currentId);
      }

      let localTs = ts;
      for (let d = 0; d < stack.length; d++) {
        const node = stack[d];
        if (!node?.callFrame) continue;

        const { functionName, url, lineNumber, columnNumber } = node.callFrame;
        const remaining = dur - (localTs - ts);
        const currentDur = d === stack.length - 1 ? remaining : remaining / (stack.length - d);

        mergedEvents.push({
          ph: 'X',
          name: functionName || '(anonymous)',
          cat: 'function',
          pid,
          tid,
          ts: Math.round(localTs),
          dur: Math.round(currentDur),
          args: { url, line: lineNumber, col: columnNumber }
        });

        localTs += currentDur;
      }

      ts += dur;
    }
  }

  mergedEvents.sort((a, b) => a.ts - b.ts);

  await writeFile(outputFile, JSON.stringify({
    traceEvents: mergedEvents,
    displayTimeUnit: 'ms'
  }, null, 2));

  console.log(`✅ Merged ${files.length} trace(s) written to ${outputFile}`);
}

mergeProfiles().catch(console.error); 