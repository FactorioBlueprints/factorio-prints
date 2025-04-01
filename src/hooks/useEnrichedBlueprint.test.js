import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useEnrichedBlueprint } from './useEnrichedBlueprint';
import useRawBlueprint from './useRawBlueprint';
import enrichBlueprint from '../utils/enrichBlueprint';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('./useRawBlueprint', () => ({
	default: vi.fn(),
}));

vi.mock('../utils/enrichBlueprint', () => ({
	default: vi.fn(),
}));

// Mock QueryProvider for testing
const createTestQueryClient = () => new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

describe('useEnrichedBlueprint', () =>
{
	const expectedBlueprintId = 'test-blueprint-123';
	const expectedBlueprintSummary = {
		title : 'Test Blueprint',
		author: {
			userId     : 'user-123',
			displayName: 'Test User',
		},
	};
	const expectedRawBlueprint = {
		title              : 'Test Blueprint',
		blueprintString    : '0testBlueprintString',
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

	const expectedEnrichedBlueprint = {
		...expectedRawBlueprint,
		key                : expectedBlueprintId,
		thumbnail          : 'https://mock-thumbnail-url.jpg',
		renderedDescription: '<h1>Test Description</h1>',
		parsedData         : { mockParsedData: true },
		tags               : {
			'/category/subcategory/': true,
			'/feature/test/'        : true,
		},
	};

	beforeEach(() =>
	{
		vi.clearAllMocks();

		// Set up the useRawBlueprint mock
		useRawBlueprint.mockImplementation(() => ({
			data     : expectedRawBlueprint,
			isLoading: false,
			isError  : false,
			error    : null,
		}));

		// Set up the enrichBlueprint mock
		enrichBlueprint.mockReturnValue(expectedEnrichedBlueprint);
	});

	it('should return enriched blueprint data when raw data is available', async () =>
	{
		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedBlueprint(expectedBlueprintId, expectedBlueprintSummary), { wrapper });

		// Check if useRawBlueprint was called with correct ID and summary
		expect(useRawBlueprint).toHaveBeenCalledWith(expectedBlueprintId, expectedBlueprintSummary);

		// Check if enrichBlueprint was called with raw data and ID
		expect(enrichBlueprint).toHaveBeenCalledWith(expectedRawBlueprint, expectedBlueprintId);

		// Verify the enriched data is returned
		expect(result.current.data).toEqual(expectedEnrichedBlueprint);
	});

	it('should return undefined data when raw data is not available', async () =>
	{
		useRawBlueprint.mockImplementation(() => ({
			data     : undefined,
			isLoading: false,
			isError  : false,
			error    : null,
		}));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedBlueprint(expectedBlueprintId, expectedBlueprintSummary), { wrapper });

		// Verify that enrichBlueprint was not called
		expect(enrichBlueprint).not.toHaveBeenCalled();

		// Verify the data is undefined
		expect(result.current.data).toBeUndefined();
	});

	it('should preserve loading state from the raw query', async () =>
	{
		useRawBlueprint.mockImplementation(() => ({
			data     : undefined,
			isLoading: true,
			isError  : false,
			error    : null,
		}));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedBlueprint(expectedBlueprintId, expectedBlueprintSummary), { wrapper });

		// Verify loading state is preserved
		expect(result.current.isLoading).toBe(true);
		expect(result.current.data).toBeUndefined();
	});

	it('should preserve error state from the raw query', async () =>
	{
		const expectedError = new Error('Failed to fetch blueprint');
		useRawBlueprint.mockImplementation(() => ({
			data     : undefined,
			isLoading: false,
			isError  : true,
			error    : expectedError,
		}));

		const queryClient = createTestQueryClient();
		const wrapper = ({ children }) => (
			React.createElement(QueryClientProvider, { client: queryClient }, children)
		);

		const { result } = renderHook(() => useEnrichedBlueprint(expectedBlueprintId, expectedBlueprintSummary), { wrapper });

		// Verify error state is preserved
		expect(result.current.isError).toBe(true);
		expect(result.current.error).toEqual(expectedError);
	});
});
