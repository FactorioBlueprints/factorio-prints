import * as Sentry from '@sentry/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import enrichBlueprint from './enrichBlueprint';

vi.mock('@sentry/react', () => ({
	captureMessage: vi.fn(),
	captureException: vi.fn(),
}));

describe('enrichBlueprint', () => {
	const blueprintId = 'blueprint-123';
	const validV15BlueprintString =
		'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';
	let rawBlueprint: any;

	beforeEach(() => {
		vi.clearAllMocks();

		rawBlueprint = {
			title: 'Test Blueprint',
			blueprintString: validV15BlueprintString,
			createdDate: 1620000000000,
			descriptionMarkdown: '# Test Description\n\nThis is a test blueprint with **markdown**.',
			lastUpdatedDate: 1630000000000,
			numberOfFavorites: 42,
			tags: ['/category/subcategory/', '/feature/test/'],
			author: {
				userId: 'user-123',
				displayName: 'Test User',
			},
			image: {
				id: 'image-123',
				type: 'image/png',
			},
			favorites: {'user-1': true, 'user-2': true},
		};
	});

	it('returns null if rawBlueprint is null', () => {
		expect(enrichBlueprint(null, blueprintId)).toBeNull();
	});

	it('adds the key field with the blueprintId', () => {
		const result = enrichBlueprint(rawBlueprint, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.key).toBe(blueprintId);
	});

	it('creates thumbnail from image data', () => {
		const result = enrichBlueprint(rawBlueprint, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.thumbnail).toBe('https://i.imgur.com/image-123l.png');
	});

	it('handles missing image id gracefully', () => {
		const blueprintWithoutImageId = {...rawBlueprint, image: {id: '', type: 'image/png'}};
		const result = enrichBlueprint(blueprintWithoutImageId, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.thumbnail).toBeNull();
	});

	it('converts array tags to object format', () => {
		const result = enrichBlueprint(rawBlueprint, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.tags).toEqual({
			'/category/subcategory/': true,
			'/feature/test/': true,
		});
	});

	it('handles blueprint with different image types', () => {
		const blueprintWithJpegImage = {
			...rawBlueprint,
			image: {id: 'image-456', type: 'image/jpeg'},
		};
		const result = enrichBlueprint(blueprintWithJpegImage, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.thumbnail).toBe('https://i.imgur.com/image-456l.jpeg');
	});

	it('skips malformed tag paths and reports to Sentry', () => {
		const blueprintWithBadTags = {
			...rawBlueprint,
			tags: ['badTag', '/valid/tag/', 'another-bad-tag/'],
		};
		const result = enrichBlueprint(blueprintWithBadTags, blueprintId);

		expect(result).not.toBeNull();
		expect(result!.tags).toEqual({
			'/valid/tag/': true,
		});

		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			'Blueprint tag format issues detected',
			expect.objectContaining({
				level: 'info',
				extra: expect.objectContaining({
					issues: expect.arrayContaining([
						{type: 'invalid-format', tag: 'badTag'},
						{type: 'invalid-format', tag: 'another-bad-tag/'},
					]),
				}),
			}),
		);
	});

	it('skips URL-encoded tags and reports to Sentry', () => {
		const blueprintWithEncodedTags = {
			...rawBlueprint,
			tags: ['/category%20space/', '/valid/tag/'],
		};
		const result = enrichBlueprint(blueprintWithEncodedTags, blueprintId);

		expect(result).not.toBeNull();
		expect(result!.tags).toEqual({
			'/valid/tag/': true,
		});

		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			'Blueprint tag format issues detected',
			expect.objectContaining({
				level: 'info',
				extra: expect.objectContaining({
					issues: expect.arrayContaining([{type: 'url-encoded', tag: '/category%20space/'}]),
				}),
			}),
		);
	});

	it('parses V15 blueprint string and returns parsed data', () => {
		const result = enrichBlueprint(rawBlueprint, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.parsedData).toEqual({
			blueprint: {
				item: 'blueprint',
				label: 'Inserters',
				version: 64424640512,
				icons: expect.arrayContaining([
					expect.objectContaining({
						signal: {name: 'long-handed-inserter', type: 'item'},
						index: 1,
					}),
				]),
				entities: expect.arrayContaining([
					expect.objectContaining({
						entity_number: expect.any(Number),
						name: expect.any(String),
						position: expect.objectContaining({
							x: expect.any(Number),
							y: expect.any(Number),
						}),
					}),
				]),
			},
		});
	});

	it('handles invalid blueprint strings gracefully', () => {
		const invalidBlueprint = {
			...rawBlueprint,
			blueprintString: 'invalid-blueprint-string',
		};
		const result = enrichBlueprint(invalidBlueprint, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.parsedData).toBeNull();
	});

	it('renders markdown description to HTML', () => {
		const result = enrichBlueprint(rawBlueprint, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.renderedDescription).toContain('<h1>Test Description</h1>');
		expect(result!.renderedDescription).toContain('<strong>markdown</strong>');
	});

	it('sanitizes HTML in markdown', () => {
		const blueprintWithScriptTag = {
			...rawBlueprint,
			descriptionMarkdown: 'Test <script>alert("XSS")</script> content',
		};
		const result = enrichBlueprint(blueprintWithScriptTag, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.renderedDescription).not.toContain('<script>');
	});

	it('handles empty markdown description', () => {
		const blueprintWithoutDescription = {
			...rawBlueprint,
			descriptionMarkdown: '',
		};
		const result = enrichBlueprint(blueprintWithoutDescription, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.renderedDescription).toBe('');
	});

	it('preserves original fields from the raw blueprint', () => {
		const result = enrichBlueprint(rawBlueprint, blueprintId);
		expect(result).toEqual({
			...rawBlueprint,
			key: blueprintId,
			thumbnail: 'https://i.imgur.com/image-123l.png',
			parsedData: expect.objectContaining({
				blueprint: expect.objectContaining({
					item: 'blueprint',
					label: 'Inserters',
					version: 64424640512,
				}),
			}),
			renderedDescription: expect.stringContaining('<h1>Test Description</h1>'),
			tags: {
				'/category/subcategory/': true,
				'/feature/test/': true,
			},
		});
	});

	it('adds table classes to rendered markdown tables', () => {
		const blueprintWithTable = {
			...rawBlueprint,
			descriptionMarkdown: '| Header | Value |\n|--------|-------|\n| Test   | Data  |',
		};
		const result = enrichBlueprint(blueprintWithTable, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.renderedDescription).toContain('class="table table-striped table-bordered"');
	});

	it('does not throw errors that would be caught by Sentry', () => {
		const blueprintWithMultipleIssues = {
			...rawBlueprint,
			tags: ['invalid-tag', '/valid/tag/', 'missing-slash/', '/encoded%20tag/', null, undefined, 123],
		};

		expect(() => enrichBlueprint(blueprintWithMultipleIssues, blueprintId)).not.toThrow();

		const result = enrichBlueprint(blueprintWithMultipleIssues, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.tags).toEqual({
			'/valid/tag/': true,
		});
	});

	it('handles tags as object format by converting to empty array and reports to Sentry', () => {
		const blueprintWithObjectTags = {
			...rawBlueprint,
			tags: {
				'/valid/tag/': true,
				'invalid-tag': true,
				'/encoded%20tag/': true,
				'/another/valid/': false,
			} as any,
		};

		const result = enrichBlueprint(blueprintWithObjectTags, blueprintId);
		expect(result).not.toBeNull();
		expect(result!.tags).toEqual({}); // Empty tags since object format is converted to empty array

		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			'Blueprint data corruption detected',
			expect.objectContaining({
				level: 'warning',
				extra: expect.objectContaining({
					issues: expect.objectContaining({
						type: 'non-array-tags',
						actualType: 'object',
					}),
				}),
			}),
		);
	});

	it('reports non-string tags to Sentry with context', () => {
		const blueprintWithBadTags = {
			...rawBlueprint,
			tags: ['valid-tag', null, undefined, 123, '/another/tag/'],
		};

		const result = enrichBlueprint(blueprintWithBadTags, blueprintId);
		expect(result).not.toBeNull();

		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			'Blueprint data corruption detected',
			expect.objectContaining({
				level: 'warning',
				extra: expect.objectContaining({
					issues: expect.objectContaining({
						type: 'non-string-tags',
						count: 3,
						types: ['null', 'undefined', 'number'],
					}),
				}),
			}),
		);
	});

	it('reports tag format issues to Sentry', () => {
		const blueprintWithFormatIssues = {
			...rawBlueprint,
			tags: ['missing-slashes', '/valid/tag/', '/encoded%20tag/'],
		};

		const result = enrichBlueprint(blueprintWithFormatIssues, blueprintId);
		expect(result).not.toBeNull();

		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			'Blueprint tag format issues detected',
			expect.objectContaining({
				level: 'info',
				extra: expect.objectContaining({
					issues: expect.arrayContaining([
						{type: 'invalid-format', tag: 'missing-slashes'},
						{type: 'url-encoded', tag: '/encoded%20tag/'},
					]),
				}),
			}),
		);
	});
});
