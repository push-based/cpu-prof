import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

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

interface ProfileInfo {
  profile: CpuProfile;
  pid: number;
  isMain: boolean;
}

interface TraceOutput {
  traceEvents: TraceEvent[];
  displayTimeUnit: string;
}

export function mergeCpuProfiles(profiles: ProfileInfo[]): TraceOutput {
  const mergedEvents: TraceEvent[] = [];
  let defaultTid = 10000;

  for (const { profile, pid, isMain } of profiles) {
    const tid = isMain ? 0 : defaultTid++;

    // 1) Thread metadata
    mergedEvents.push({
      ph: 'M',
      name: 'thread_name',
      pid,
      tid,
      ts: 0,
      cat: '__metadata',
      args: { name: isMain ? 'Main Thread (.001)' : `Thread ${tid}` }
    });

    // 2) Quick lookup tables
    const nodeMap = new Map<number, ProfileNode>();
    profile.nodes.forEach(n => nodeMap.set(n.id, n));

    const childToParent = new Map<number, number>();
    for (const n of profile.nodes) {
      for (const c of n.children || []) {
        childToParent.set(c, n.id);
      }
    }

    // 3) Emit runMainESM as one full-span event
    const runMainNode = profile.nodes.find(n => n.callFrame.functionName === 'runMainESM');
    if (runMainNode) {
      const startUs = profile.startTime * 1000;
      const totalUs = (profile.endTime - profile.startTime) * 1000;
      mergedEvents.push({
        ph: 'X',
        name: 'runMainESM',
        cat: 'function',
        pid,
        tid,
        ts: Math.round(startUs),
        dur: Math.round(totalUs),
        args: {
          url: runMainNode.callFrame.url,
          line: runMainNode.callFrame.lineNumber,
          col: runMainNode.callFrame.columnNumber
        }
      });
    }

    // 4) Emit a single 'main' span covering both child phases
    const mainNode = profile.nodes.find(n => n.callFrame.functionName === 'main');
    if (mainNode && profile.timeDeltas.length >= 3) {
      const startUs = profile.startTime * 1000 + profile.timeDeltas[0] * 1000;
      const durUs = profile.timeDeltas
          .slice(1)
          .reduce((sum, d) => sum + d, 0) * 1000;
      mergedEvents.push({
        ph: 'X',
        name: 'main',
        cat: 'function',
        pid,
        tid,
        ts: Math.round(startUs),
        dur: Math.round(durUs),
        args: {
          url: mainNode.callFrame.url,
          line: mainNode.callFrame.lineNumber,
          col: mainNode.callFrame.columnNumber
        }
      });
    }

    // 5) Walk samples and emit only the true leaf calls (loadConfig & startServer)
    let ts = profile.startTime * 1000;
    for (let i = 0; i < profile.samples.length; i++) {
      const nodeId = profile.samples[i];
      const deltaUs = profile.timeDeltas[i] * 1000;

      // Reconstruct full stack
      const stack: ProfileNode[] = [];
      let cur = nodeId;
      const seen = new Set<number>();
      while (cur !== undefined && !seen.has(cur)) {
        seen.add(cur);
        const n = nodeMap.get(cur);
        if (n) stack.unshift(n);
        cur = childToParent.get(cur);
      }

      // Filter to your code only
      const userFrames = stack.filter(n =>
          !['(root)', 'runMainESM', 'main'].includes(n.callFrame.functionName)
      );

      if (userFrames.length) {
        const leaf = userFrames[userFrames.length - 1];
        const { functionName, url, lineNumber, columnNumber } = leaf.callFrame;
        mergedEvents.push({
          ph: 'X',
          name: functionName || '(anonymous)',
          cat: 'function',
          pid,
          tid,
          ts: Math.round(ts),
          dur: Math.round(deltaUs),
          args: { url, line: lineNumber, col: columnNumber }
        });
      }

      ts += deltaUs;
    }
  }

  mergedEvents.sort((a, b) => a.ts - b.ts);

  return { traceEvents: mergedEvents, displayTimeUnit: 'ms' };
}

/**
 * File I/O wrapper that reads CPU profiles from a directory and writes the merged trace
 * @param inputDir Directory containing the CPU profiles
 * @param outputDir Directory to write the merged trace file
 * @param outputFile Full path of the output file
 */
export async function mergeProfileFiles(inputDir: string, outputDir: string, outputFile: string): Promise<void> {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  const files = (await readdir(inputDir)).filter(f => f.endsWith('.cpuprofile')).sort();

  if (files.length === 0) {
    throw new Error(`No .cpuprofile files found in ${inputDir}`);
  }

  const profiles: ProfileInfo[] = await Promise.all(
    files.map(async file => {
      const path = join(inputDir, file);
      const content = await readFile(path, 'utf8');
      const profile = JSON.parse(content) as CpuProfile;

      // Extract PID and detect if this is the main thread (.001)
      const pid = parseInt(file.match(/CPU\.\d+\.\d+\.(\d+)\./)?.[1] || '1', 10);
      const seq = file.match(/CPU\.\d+\.\d+\.\d+\.\d+\.(\d+)\.cpuprofile$/)?.[1];
      const isMain = seq === '001';

      return { profile, pid, isMain };
    })
  );

  const output = mergeCpuProfiles(profiles);
  await writeFile(outputFile, JSON.stringify(output, null, 2));

  console.log(`✅ Merged ${files.length} trace(s) written to ${outputFile}`);
}

// Keep the old name for backward compatibility
export const mergeProfiles = mergeProfileFiles; 
