import {renderHook} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useEnrichedTagBlueprintSummaries} from './useEnrichedTagBlueprintSummaries';
import {useRawTagBlueprintSummaries} from './useRawTagBlueprintSummaries';
import {enrichBlueprintSummary} from '../utils/enrichBlueprintSummary';
import {vi, describe, it, expect, beforeEach} from 'vitest';
import React from 'react';
import type {RawBlueprintSummary, EnrichedBlueprintSummary} from '../schemas';
import type {UseQueryResult} from '@tanstack/react-query';

// Helper function to create a partial UseQueryResult with defaults
const createMockQueryResult = <T>(overrides: Partial<UseQueryResult<T, Error>>): UseQueryResult<T, Error> =>
	({
		data: undefined,
		error: null,
		isError: false,
		isLoading: false,
		isSuccess: false,
		isPending: false,
		status: 'pending',
		fetchStatus: 'idle',
		isFetching: false,
		isStale: false,
		isRefetching: false,
		isLoadingError: false,
		isRefetchError: false,
		refetch: vi.fn(),
		...overrides,
	}) as UseQueryResult<T, Error>;

// Mock dependencies
vi.mock('./useRawTagBlueprintSummaries');
vi.mock('../utils/enrichBlueprintSummary');

const mockRawBlueprintSummary1: RawBlueprintSummary = {
	title: 'Test Blueprint 1',
	imgurId: 'img1',
	imgurType: 'image/png',
	numberOfFavorites: 10,
	lastUpdatedDate: 1000,
};

const mockRawBlueprintSummary2: RawBlueprintSummary = {
	title: 'Test Blueprint 2',
	imgurId: 'img2',
	imgurType: 'image/jpeg',
	numberOfFavorites: 20,
	lastUpdatedDate: 2000,
};

const mockEnrichedBlueprintSummary1: EnrichedBlueprintSummary = {
	...mockRawBlueprintSummary1,
	key: 'blueprint1',
	thumbnail: 'https://i.imgur.com/img1b.png',
};

const mockEnrichedBlueprintSummary2: EnrichedBlueprintSummary = {
	...mockRawBlueprintSummary2,
	key: 'blueprint2',
	thumbnail: 'https://i.imgur.com/img2b.jpeg',
};

describe('useEnrichedTagBlueprintSummaries', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		vi.clearAllMocks();
	});

	const wrapper = ({children}: {children: React.ReactNode}) =>
		React.createElement(QueryClientProvider, {client: queryClient}, children);

	it('should use useRawTagBlueprintSummaries with the correct tagId', () => {
		const mockRawResult = {
			tagQuery: createMockQueryResult({data: {}, isLoading: false, isSuccess: true, isError: false}),
			blueprintQueries: {},
			blueprintIds: [],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);

		renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		expect(useRawTagBlueprintSummaries).toHaveBeenCalledWith('test-tag');
	});

	it('should enrich blueprint summaries when raw data is available', () => {
		const mockRawBlueprintQuery1 = createMockQueryResult<RawBlueprintSummary>({
			data: mockRawBlueprintSummary1,
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
		});

		const mockRawBlueprintQuery2 = createMockQueryResult<RawBlueprintSummary>({
			data: mockRawBlueprintSummary2,
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
		});

		const mockRawResult = {
			tagQuery: createMockQueryResult({
				data: {blueprint1: true, blueprint2: true},
				isLoading: false,
				isSuccess: true,
				isError: false,
			}),
			blueprintQueries: {
				blueprint1: mockRawBlueprintQuery1,
				blueprint2: mockRawBlueprintQuery2 as UseQueryResult<RawBlueprintSummary | null, Error>,
			},
			blueprintIds: ['blueprint1', 'blueprint2'],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);
		vi.mocked(enrichBlueprintSummary)
			.mockReturnValueOnce(mockEnrichedBlueprintSummary1)
			.mockReturnValueOnce(mockEnrichedBlueprintSummary2);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawBlueprintSummary1, 'blueprint1');
		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawBlueprintSummary2, 'blueprint2');

		expect(result.current.blueprintQueries.blueprint1.data).toEqual(mockEnrichedBlueprintSummary1);
		expect(result.current.blueprintQueries.blueprint2.data).toEqual(mockEnrichedBlueprintSummary2);
	});

	it('should not enrich when raw blueprint data is null or undefined', () => {
		const mockRawBlueprintQuery1 = createMockQueryResult<RawBlueprintSummary | null>({
			data: undefined,
			isLoading: false,
			isSuccess: false,
			isError: true,
			error: new Error('No data'),
		});

		const mockRawBlueprintQuery2 = createMockQueryResult<RawBlueprintSummary | null>({
			data: null,
			isLoading: false,
			isSuccess: false,
			isError: true,
			error: new Error('No data'),
		});

		const mockRawResult = {
			tagQuery: createMockQueryResult({
				data: {blueprint1: true, blueprint2: true},
				isLoading: false,
				isSuccess: true,
				isError: false,
			}),
			blueprintQueries: {
				blueprint1: mockRawBlueprintQuery1,
				blueprint2: mockRawBlueprintQuery2 as UseQueryResult<RawBlueprintSummary | null, Error>,
			},
			blueprintIds: ['blueprint1', 'blueprint2'],
			isLoading: false,
			isSuccess: false,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		expect(enrichBlueprintSummary).not.toHaveBeenCalled();
		expect(result.current.blueprintQueries.blueprint1.data).toBeUndefined();
		expect(result.current.blueprintQueries.blueprint2.data).toBeUndefined();
	});

	it('should preserve all query properties from raw blueprint queries', () => {
		const mockRefetch = vi.fn();
		const mockRawBlueprintQuery = createMockQueryResult<RawBlueprintSummary>({
			data: mockRawBlueprintSummary1,
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
			refetch: mockRefetch,
			fetchStatus: 'idle',
			isFetching: false,
			isStale: false,
			isRefetching: false,
		});

		const mockRawResult = {
			tagQuery: createMockQueryResult({
				data: {blueprint1: true},
				isLoading: false,
				isSuccess: true,
				isError: false,
			}),
			blueprintQueries: {
				blueprint1: mockRawBlueprintQuery,
			},
			blueprintIds: ['blueprint1'],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);
		vi.mocked(enrichBlueprintSummary).mockReturnValue(mockEnrichedBlueprintSummary1);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		const enrichedQuery = result.current.blueprintQueries.blueprint1;

		expect(enrichedQuery.isLoading).toBe(false);
		expect(enrichedQuery.isSuccess).toBe(true);
		expect(enrichedQuery.isError).toBe(false);
		expect(enrichedQuery.error).toBeNull();
		expect(enrichedQuery.refetch).toBe(mockRefetch);
		expect(enrichedQuery.fetchStatus).toBe('idle');
		expect(enrichedQuery.isFetching).toBe(false);
		expect(enrichedQuery.isStale).toBe(false);
		expect(enrichedQuery.isRefetching).toBe(false);
	});

	it('should preserve top-level properties from raw result', () => {
		const mockRawBlueprintQuery = createMockQueryResult<RawBlueprintSummary>({
			data: mockRawBlueprintSummary1,
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
		});

		const mockTagQuery = createMockQueryResult({
			data: {blueprint1: true},
			isLoading: false,
			isSuccess: true,
			isError: false,
		});
		const mockRawResult = {
			tagQuery: mockTagQuery,
			blueprintQueries: {
				blueprint1: mockRawBlueprintQuery,
			},
			blueprintIds: ['blueprint1'],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);
		vi.mocked(enrichBlueprintSummary).mockReturnValue(mockEnrichedBlueprintSummary1);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		expect(result.current.tagQuery).toBe(mockTagQuery);
		expect(result.current.blueprintIds).toEqual(['blueprint1']);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isSuccess).toBe(true);
		expect(result.current.isError).toBe(false);
	});

	it('should handle empty blueprint list', () => {
		const mockRawResult = {
			tagQuery: createMockQueryResult({data: {}, isLoading: false, isSuccess: true, isError: false}),
			blueprintQueries: {},
			blueprintIds: [],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('empty-tag'), {wrapper});

		expect(enrichBlueprintSummary).not.toHaveBeenCalled();
		expect(result.current.blueprintQueries).toEqual({});
		expect(result.current.blueprintIds).toEqual([]);
	});

	it('should handle error states from raw queries', () => {
		const mockError = new Error('Test error');
		const mockRawBlueprintQuery = createMockQueryResult<RawBlueprintSummary>({
			data: undefined,
			isLoading: false,
			isSuccess: false,
			isError: true,
			error: mockError,
		});

		const mockRawResult = {
			tagQuery: createMockQueryResult({
				data: {blueprint1: true},
				isLoading: false,
				isSuccess: true,
				isError: false,
			}),
			blueprintQueries: {
				blueprint1: mockRawBlueprintQuery,
			},
			blueprintIds: ['blueprint1'],
			isLoading: false,
			isSuccess: false,
			isError: true,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('error-tag'), {wrapper});

		expect(enrichBlueprintSummary).not.toHaveBeenCalled();
		expect(result.current.blueprintQueries.blueprint1.isError).toBe(true);
		expect(result.current.blueprintQueries.blueprint1.error).toBe(mockError);
		expect(result.current.blueprintQueries.blueprint1.data).toBeUndefined();
		expect(result.current.isError).toBe(true);
	});

	it('should memoize enriched queries properly', () => {
		const mockRawBlueprintQuery = createMockQueryResult<RawBlueprintSummary>({
			data: mockRawBlueprintSummary1,
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
		});

		const mockRawResult = {
			tagQuery: createMockQueryResult({
				data: {blueprint1: true},
				isLoading: false,
				isSuccess: true,
				isError: false,
			}),
			blueprintQueries: {
				blueprint1: mockRawBlueprintQuery,
			},
			blueprintIds: ['blueprint1'],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);
		vi.mocked(enrichBlueprintSummary).mockReturnValue(mockEnrichedBlueprintSummary1);

		const {result, rerender} = renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		const firstEnrichedQueries = result.current.blueprintQueries;

		// Rerender with same data - should use memoized result
		rerender();

		expect(result.current.blueprintQueries).toBe(firstEnrichedQueries);
		expect(enrichBlueprintSummary).toHaveBeenCalledTimes(1);
	});

	it('should re-enrich when raw data changes', () => {
		const mockRawBlueprintQuery = createMockQueryResult<RawBlueprintSummary>({
			data: mockRawBlueprintSummary1,
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
		});

		const mockRawResult = {
			tagQuery: createMockQueryResult({
				data: {blueprint1: true},
				isLoading: false,
				isSuccess: true,
				isError: false,
			}),
			blueprintQueries: {
				blueprint1: mockRawBlueprintQuery,
			},
			blueprintIds: ['blueprint1'],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);
		vi.mocked(enrichBlueprintSummary).mockReturnValue(mockEnrichedBlueprintSummary1);

		const {rerender} = renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		expect(enrichBlueprintSummary).toHaveBeenCalledTimes(1);

		// Update raw data
		const updatedRawQuery = createMockQueryResult<RawBlueprintSummary>({
			data: {...mockRawBlueprintSummary1, title: 'Updated Blueprint'},
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
		});

		const updatedRawResult = {
			...mockRawResult,
			blueprintQueries: {
				blueprint1: updatedRawQuery,
			},
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(updatedRawResult);
		vi.mocked(enrichBlueprintSummary).mockReturnValue({
			...mockEnrichedBlueprintSummary1,
			title: 'Updated Blueprint',
		});

		rerender();

		expect(enrichBlueprintSummary).toHaveBeenCalledTimes(2);
		expect(enrichBlueprintSummary).toHaveBeenLastCalledWith(
			{...mockRawBlueprintSummary1, title: 'Updated Blueprint'},
			'blueprint1',
		);
	});

	it('should handle mixed success and error states', () => {
		const mockSuccessQuery = createMockQueryResult<RawBlueprintSummary>({
			data: mockRawBlueprintSummary1,
			isLoading: false,
			isSuccess: true,
			isError: false,
			error: null,
		});

		const mockErrorQuery = createMockQueryResult<RawBlueprintSummary>({
			data: undefined,
			isLoading: false,
			isSuccess: false,
			isError: true,
			error: new Error('Failed to fetch'),
		});

		const mockRawResult = {
			tagQuery: createMockQueryResult({
				data: {blueprint1: true, blueprint2: true},
				isLoading: false,
				isSuccess: true,
				isError: false,
			}),
			blueprintQueries: {
				blueprint1: mockSuccessQuery,
				blueprint2: mockErrorQuery,
			},
			blueprintIds: ['blueprint1', 'blueprint2'],
			isLoading: false,
			isSuccess: false,
			isError: true,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);
		vi.mocked(enrichBlueprintSummary).mockReturnValue(mockEnrichedBlueprintSummary1);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('mixed-tag'), {wrapper});

		// Should enrich successful queries
		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawBlueprintSummary1, 'blueprint1');
		expect(result.current.blueprintQueries.blueprint1.data).toEqual(mockEnrichedBlueprintSummary1);

		// Should preserve error state for failed queries
		expect(result.current.blueprintQueries.blueprint2.isError).toBe(true);
		expect(result.current.blueprintQueries.blueprint2.data).toBeUndefined();

		// Overall state should reflect error
		expect(result.current.isError).toBe(true);
		expect(result.current.isSuccess).toBe(false);
	});

	it('should return correct structure with all expected properties', () => {
		const mockRawResult = {
			tagQuery: createMockQueryResult({data: {}, isLoading: false, isSuccess: true, isError: false}),
			blueprintQueries: {},
			blueprintIds: [],
			isLoading: false,
			isSuccess: true,
			isError: false,
		};

		vi.mocked(useRawTagBlueprintSummaries).mockReturnValue(mockRawResult);

		const {result} = renderHook(() => useEnrichedTagBlueprintSummaries('test-tag'), {wrapper});

		// Check that all expected properties are present
		expect(result.current).toHaveProperty('tagQuery');
		expect(result.current).toHaveProperty('blueprintQueries');
		expect(result.current).toHaveProperty('isLoading');
		expect(result.current).toHaveProperty('isError');
		expect(result.current).toHaveProperty('isSuccess');
		expect(result.current).toHaveProperty('blueprintIds');

		// Check types
		expect(typeof result.current.isLoading).toBe('boolean');
		expect(typeof result.current.isError).toBe('boolean');
		expect(typeof result.current.isSuccess).toBe('boolean');
		expect(Array.isArray(result.current.blueprintIds)).toBe(true);
		expect(typeof result.current.blueprintQueries).toBe('object');
	});
});
