import { vi, describe, it, expect, beforeEach } from 'vitest';
import enrichBlueprint from './enrichBlueprint';
import Blueprint from '../Blueprint';
import buildImageUrl from '../helpers/buildImageUrl';
import { validateRawBlueprint, validateEnrichedBlueprint } from '../schemas';

// Mock dependencies
vi.mock('../Blueprint', () =>
{
	return {
		default: vi.fn().mockImplementation(() => ({
			getV15Decoded: vi.fn().mockReturnValue({ mockParsedData: true }),
		})),
	};
});

vi.mock('../helpers/buildImageUrl', () =>
{
	return {
		default: vi.fn().mockReturnValue('https://mock-thumbnail-url.jpg'),
	};
});

vi.mock('../schemas', () =>
{
	return {
		validateRawBlueprint     : vi.fn().mockImplementation(data => data),
		validateEnrichedBlueprint: vi.fn().mockImplementation(data => data),
	};
});

vi.mock('markdown-it', () =>
{
	return {
		default: vi.fn().mockImplementation(() => ({
			renderer: {
				rules: {},
			},
			render: vi.fn().mockReturnValue('<p>Parsed markdown</p>'),
		})),
	};
});

vi.mock('dompurify', () =>
{
	return {
		default: {
			sanitize: vi.fn().mockImplementation(html => html),
		},
	};
});

describe('enrichBlueprint', () =>
{
	let mockRawBlueprint;
	const mockBlueprintId = 'blueprint-123';

	beforeEach(() =>
	{
		mockRawBlueprint = {
			title              : 'Test Blueprint',
			blueprintString    : '0mockBlueprintString',
			createdDate        : 1620000000000,
			descriptionMarkdown: '# Test Description',
			lastUpdatedDate    : 1630000000000,
			numberOfFavorites  : 42,
			tags               : ['/category/subcategory/', '/feature/test/'],
			author             : {
				userId     : 'user-123',
				displayName: 'Test User',
			},
			image: {
				id  : 'image-123',
				type: 'image/png',
			},
			favorites: { 'user-1': true, 'user-2': true },
		};

		// Reset mocks
		vi.clearAllMocks();
	});

	it('returns null if rawBlueprint is null', () =>
	{
		expect(enrichBlueprint(null, mockBlueprintId)).toBeNull();
	});

	it('validates the raw blueprint using validateRawBlueprint', () =>
	{
		enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(validateRawBlueprint).toHaveBeenCalledWith(mockRawBlueprint);
	});

	it('adds the key field with the blueprintId', () =>
	{
		const result = enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(result.key).toBe(mockBlueprintId);
	});

	it('creates thumbnail from image data', () =>
	{
		enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(buildImageUrl).toHaveBeenCalledWith('image-123', 'image/png', 'l');
	});

	it('handles missing image gracefully', () =>
	{
		const blueprintWithoutImage = { ...mockRawBlueprint, image: null };
		const result = enrichBlueprint(blueprintWithoutImage, mockBlueprintId);
		expect(result.thumbnail).toBeNull();
		expect(buildImageUrl).not.toHaveBeenCalled();
	});

	it('converts array tags to object format', () =>
	{
		const result = enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(result.tags).toEqual({
			'/category/subcategory/': true,
			'/feature/test/'        : true,
		});
	});

	it('handles object format tags', () =>
	{
		const blueprintWithObjectTags = {
			...mockRawBlueprint,
			tags: { '/category/subcategory/': true, '/feature/test/': true },
		};
		const result = enrichBlueprint(blueprintWithObjectTags, mockBlueprintId);
		expect(result.tags).toEqual({
			'/category/subcategory/': true,
			'/feature/test/'        : true,
		});
	});

	it('throws error for malformed tag paths', () =>
	{
		const blueprintWithBadTags = {
			...mockRawBlueprint,
			tags: ['badTag'],
		};
		expect(() => enrichBlueprint(blueprintWithBadTags, mockBlueprintId))
			.toThrow('Tag format error: "badTag" must have leading and trailing slashes');
	});

	it('parses blueprint string using Blueprint class', () =>
	{
		enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(Blueprint).toHaveBeenCalledWith('0mockBlueprintString');
	});

	it('renders markdown description to HTML', () =>
	{
		const result = enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(result.renderedDescription).toBe('<p>Parsed markdown</p>');
	});

	it('validates the enriched blueprint before returning', () =>
	{
		enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(validateEnrichedBlueprint).toHaveBeenCalled();
	});

	it('preserves original fields from the raw blueprint', () =>
	{
		const result = enrichBlueprint(mockRawBlueprint, mockBlueprintId);
		expect(result.title).toBe(mockRawBlueprint.title);
		expect(result.blueprintString).toBe(mockRawBlueprint.blueprintString);
		expect(result.createdDate).toBe(mockRawBlueprint.createdDate);
		expect(result.lastUpdatedDate).toBe(mockRawBlueprint.lastUpdatedDate);
		expect(result.numberOfFavorites).toBe(mockRawBlueprint.numberOfFavorites);
		expect(result.author).toEqual(mockRawBlueprint.author);
		expect(result.favorites).toEqual(mockRawBlueprint.favorites);
	});
});
