import { performance, type PerformanceEntry } from 'node:perf_hooks';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TraceEvent } from './traceprofile.types';
import {
  createNxTaskCompleteEvent,
  createNxErrorInstantEvent,
  createTraceContainer,
  getPerfLogName,
  type TaskStatus,
} from './logging-utils';

/**
 * A file-based performance logger that collects trace events and writes them
 * to Chrome DevTools compatible trace files.
 */
export class PerfFileLogger {
  private readonly entries: TraceEvent[];
  private readonly logDir: string;
  private readonly pid: number;
  private readonly tid: number;

  constructor() {
    this.entries = [];
    this.logDir = join(process.cwd(), 'nx-perf-logs');
    this.pid = process.pid;
    this.tid = 1;

    // Handle process exit
    process.on('exit', () => this.writeLogFile());
    process.on('SIGINT', () => {
      this.writeLogFile();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      this.writeLogFile();
      process.exit(0);
    });
    process.on('uncaughtException', (error) => {
      this.logError('uncaught-exception', error);
      this.writeLogFile();
      process.exit(1);
    });

    // Write files periodically in case exit handlers don't work
    setInterval(() => {
      if (this.entries.length > 0) {
        this.writeLogFile();
      }
    }, 2000); // Write every 2 seconds if there are entries
  }

  /**
   * Logs a performance entry as a trace event.
   */
  logEntry(
    entry: PerformanceEntry,
    status: TaskStatus = 'completed',
    error?: unknown
  ) {
    const startTimeUs = Math.round(entry.startTime * 1000);
    const durationUs = Math.round(entry.duration * 1000);

    const traceEvent = createNxTaskCompleteEvent({
      name: entry.name,
      pid: this.pid,
      tid: this.tid,
      startTimeUs,
      durationUs,
      status,
      error,
    });

    this.entries.push(traceEvent);
    console.log(`Time for '${entry.name}'`, entry.duration);
    console.log(
      `📊 PerfFileLogger: Added entry ${this.entries.length}, writing file...`
    );

    // Write file immediately on every entry
    this.writeLogFile();
  }

  /**
   * Logs an error as an instant trace event.
   */
  logError(taskName: string, error: unknown) {
    const timestampUs = Math.round(performance.now() * 1000);

    const errorEvent = createNxErrorInstantEvent({
      taskName,
      pid: this.pid,
      tid: this.tid,
      timestampUs,
      error,
    });

    this.entries.push(errorEvent);
    console.error(`Error in '${taskName}':`, error);
  }

  /**
   * Writes all collected trace events to a Chrome DevTools compatible trace file.
   */
  writeLogFile() {
    // ensure directory exists
    try {
      mkdirSync(this.logDir, { recursive: true });
    } catch (err) {
      console.warn('Failed to create perf log directory:', err);
    }

    if (this.entries.length === 0) return;

    const filename = getPerfLogName({
      prefix: 'NX-TRACE',
      pid: this.pid,
      tid: this.tid,
    });
    const filepath = join(this.logDir, filename);

    const traceEventFormat = createTraceContainer(this.entries);

    try {
      writeFileSync(filepath, JSON.stringify(traceEventFormat, null, 2));
      console.log(`🔥 Chrome DevTools trace written to: ${filepath}`);
      console.log(
        `📊 To view: Open Chrome DevTools > Performance tab > Load profile`
      );
    } catch (err) {
      console.error('Failed to write performance log:', err);
    }
  }
}
