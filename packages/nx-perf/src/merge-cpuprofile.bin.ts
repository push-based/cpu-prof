#!/usr/bin/env node
import { join, isAbsolute } from 'node:path';
import { mergeProfiles } from './merge-cpuprofile';

// Get command line arguments with defaults
const [,, inDir = 'profiles', outDir = 'out'] = process.argv;

// Handle both absolute and relative paths
const inputDir = isAbsolute(inDir) ? inDir : join(process.cwd(), inDir);
const outputDir = isAbsolute(outDir) ? outDir : join(process.cwd(), outDir);
const outputFile = join(outputDir, 'merged-trace.json');

mergeProfiles(inputDir, outputDir, outputFile).catch(console.error); 