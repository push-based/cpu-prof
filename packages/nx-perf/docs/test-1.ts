export function mergeCpuProfiles(profiles: ProfileInfo[]): TraceOutput {
  const mergedEvents: TraceEvent[] = [];
  let defaultTid = 10000;

  for (const { profile, pid, isMain } of profiles) {
    const tid = isMain ? 0 : defaultTid++;

    // Thread metadata
    mergedEvents.push({
      ph: 'M',
      name: 'thread_name',
      pid,
      tid,
      ts: 0,
      cat: '__metadata',
      args: { name: isMain ? 'Main Thread (.001)' : `Thread ${tid}` },
    });

    const nodes = profile.nodes.map((n) => ({ ...n }));
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Build child → parent lookup
    const childToParent = new Map<number, number>();
    for (const node of nodes) {
      for (const child of node.children || []) {
        childToParent.set(child, node.id);
      }
    }

    // Emit nested events from samples
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

      for (let d = 0; d < stack.length; d++) {
        const node = stack[d];
        if (!node?.callFrame) continue;

        const { functionName, url, lineNumber, columnNumber } = node.callFrame;

        mergedEvents.push({
          ph: 'X',
          name: functionName || '(anonymous)',
          cat: 'function',
          pid,
          tid,
          ts: Math.round(ts),
          dur: Math.round(dur),
          args: { url, line: lineNumber, col: columnNumber },
        });
      }

      ts += dur;
    }
  }

  mergedEvents.sort((a, b) => a.ts - b.ts);

  return {
    traceEvents: mergedEvents,
    displayTimeUnit: 'ms',
  };
}
