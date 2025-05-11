#!/usr/bin/env node
import { join, isAbsolute } from 'node:path';
import { mergeCpuProfileFiles } from './merge-cpuprofile';
import { readdir, mkdir } from 'node:fs/promises';

// Get command line arguments with defaults
const [,, inDir = 'profiles', outDir = 'out'] = process.argv;

// Handle both absolute and relative paths
const inputDir = isAbsolute(inDir) ? inDir : join(process.cwd(), inDir);
const outputDir = isAbsolute(outDir) ? outDir : join(process.cwd(), outDir);
const outputFile = join(outputDir, 'merged-trace.json');

await mkdir(outputDir, { recursive: true });

const files = (await readdir(inputDir)).filter(f => f.endsWith('.cpuprofile')).sort();

mergeCpuProfileFiles(files, outputFile).catch(console.error); 