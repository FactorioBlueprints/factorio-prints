#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '..', 'package.json');

const gitTag = execSync('git describe --tags --abbrev=0').toString().trim();

const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

packageJson.version = gitTag;

writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Updated package.json version to: ${gitTag}`);
