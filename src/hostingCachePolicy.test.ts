import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

type FirebaseHeaderRule = {
	source: string;
	headers: Array<{key: string; value: string}>;
};

type FirebaseConfiguration = {
	hosting: {
		headers: FirebaseHeaderRule[];
	};
};

const readProjectFile = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const getFirebaseCacheControl = (source: string) => {
	const configuration = JSON.parse(readProjectFile('firebase.json')) as FirebaseConfiguration;
	const rule = configuration.hosting.headers.find((headerRule) => headerRule.source === source);

	return rule?.headers.find((header) => header.key === 'Cache-Control')?.value;
};

const getPagesCacheControl = (source: string) => {
	const lines = readProjectFile('public/_headers').split('\n');
	const sourceIndex = lines.findIndex((line) => line === source);
	const nextRuleIndex = lines.findIndex(
		(line, index) => index > sourceIndex && line.length > 0 && !line.startsWith(' ') && !line.startsWith('#'),
	);
	const ruleLines = lines.slice(sourceIndex + 1, nextRuleIndex === -1 ? undefined : nextRuleIndex);
	const cacheControl = ruleLines.map((line) => line.trim()).find((line) => line.startsWith('Cache-Control:'));

	return cacheControl?.replace('Cache-Control:', '').trim();
};

const getWranglerPagesConfiguration = () => {
	const configuration = readProjectFile('wrangler.toml');
	const outputDirectory = configuration.match(/^pages_build_output_dir = "(.+)"$/m)?.[1];

	return {
		outputDirectory,
		hasLegacyBuildUpload: configuration.includes('[build.upload]'),
		hasIgnoredHeaderRules: configuration.includes('[[headers]]'),
	};
};

describe('hosting cache policy', () => {
	it('revalidates app documents and caches hashed assets immutably', () => {
		expect({
			firebase: {
				appRoutes: getFirebaseCacheControl('**'),
				documents: getFirebaseCacheControl('**/*.@(html|json)'),
				hashedAssets: getFirebaseCacheControl('/assets/**'),
			},
			pages: {
				appRoutes: getPagesCacheControl('/*'),
				documents: getPagesCacheControl('/*.html'),
				json: getPagesCacheControl('/*.json'),
				hashedAssets: getPagesCacheControl('/assets/*'),
			},
			wrangler: getWranglerPagesConfiguration(),
		}).toStrictEqual({
			firebase: {
				appRoutes: 'public, max-age=0, must-revalidate',
				documents: 'public, max-age=0, must-revalidate',
				hashedAssets: 'public, max-age=31536000, immutable',
			},
			pages: {
				appRoutes: undefined,
				documents: 'public, max-age=0, must-revalidate',
				json: 'public, max-age=0, must-revalidate',
				hashedAssets: 'public, max-age=31536000, immutable',
			},
			wrangler: {
				outputDirectory: 'dist',
				hasLegacyBuildUpload: false,
				hasIgnoredHeaderRules: false,
			},
		});
	});
});
