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

const getFirebaseHeader = (source: string, key: string) => {
	const configuration = JSON.parse(readProjectFile('firebase.json')) as FirebaseConfiguration;
	const rule = configuration.hosting.headers.find((headerRule) => headerRule.source === source);

	return rule?.headers.find((header) => header.key === key)?.value;
};

const getFirebaseCacheControl = (source: string) => getFirebaseHeader(source, 'Cache-Control');

const getPagesHeader = (source: string, key: string) => {
	const lines = readProjectFile('public/_headers').split('\n');
	const sourceIndex = lines.findIndex((line) => line === source);
	const nextRuleIndex = lines.findIndex(
		(line, index) => index > sourceIndex && line.length > 0 && !line.startsWith(' ') && !line.startsWith('#'),
	);
	const ruleLines = lines.slice(sourceIndex + 1, nextRuleIndex === -1 ? undefined : nextRuleIndex);
	const header = ruleLines.map((line) => line.trim()).find((line) => line.startsWith(`${key}:`));

	return header?.replace(`${key}:`, '').trim();
};

const getPagesCacheControl = (source: string) => getPagesHeader(source, 'Cache-Control');

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

	it.each(['/service-worker.js', '/serviceWorker.js', '/sw.js'])(
		'serves the historical service worker tombstone at %s without caching',
		(source) => {
			expect({
				firebase: {
					cacheControl: getFirebaseCacheControl(source),
					allowedScope: getFirebaseHeader(source, 'Service-Worker-Allowed'),
				},
				pages: {
					cacheControl: getPagesCacheControl(source),
					allowedScope: getPagesHeader(source, 'Service-Worker-Allowed'),
				},
			}).toStrictEqual({
				firebase: {
					cacheControl: 'no-cache',
					allowedScope: '/',
				},
				pages: {
					cacheControl: 'no-cache',
					allowedScope: '/',
				},
			});
		},
	);
});
