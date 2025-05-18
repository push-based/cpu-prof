#!/usr/bin/env node
import {isAbsolute, join} from 'node:path';
import {mergeCpuProfileFiles} from './merge-cpuprofile-files';
import {mkdirSync} from 'node:fs';

const [,, inDir = 'profiles', outDir = 'profiles'] = process.argv;
const inputDir = isAbsolute(inDir) ? inDir : join(process.cwd(), inDir);
const outputDir = isAbsolute(outDir) ? outDir : join(process.cwd(), outDir);
const outputFile = join(outputDir, 'cpu-profiles-trace.json');

if(!inputDir || inputDir === '') {
    throw new Error('Input directory is required. use --inputDir <dir>');
}

mkdirSync(outputDir, { recursive: true });

mergeCpuProfileFiles(inputDir, outputFile)
    .catch(console.error)
    .finally(() => process.exit(0));
