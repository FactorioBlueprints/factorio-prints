import fs from 'fs';

const file1Content: string = fs.readFileSync('entitiesWithIcons-old.js', 'utf8');
const file2Content: string = fs.readFileSync('entitiesWithIcons-new.js', 'utf8');

function extractKeys(content: string): Set<string> {
	const keyPattern = /'([^']+)'\s*:\s*true/g;
	const matches = [...content.matchAll(keyPattern)];
	return new Set(matches.map((match) => match[1]));
}

const keysOld = extractKeys(file1Content);
const keysNew = extractKeys(file2Content);

const uniqueToNew = [...keysNew].filter((key) => !keysOld.has(key));

uniqueToNew.sort();
