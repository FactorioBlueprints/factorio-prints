import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderHook} from '@testing-library/react';
import {QueryClient, QueryClientProvider, type UseQueryResult} from '@tanstack/react-query';
import React from 'react';
import {useEnrichedBlueprintSummary} from './useEnrichedBlueprintSummary';
import {useRawBlueprintSummary} from './useRawBlueprintSummary';
import {enrichBlueprintSummary} from '../utils/enrichBlueprintSummary';

// Mock dependencies
vi.mock('./useRawBlueprintSummary');
vi.mock('../utils/enrichBlueprintSummary');

// Helper function to create a partial UseQueryResult with defaults
const _createMockQueryResult = <T,>(overrides: Partial<UseQueryResult<T, Error>>): UseQueryResult<T, Error> =>
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

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({children}: {children: React.ReactNode}) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe('useEnrichedBlueprintSummary', () => {
	const mockBlueprintId = 'test-blueprint-123';
	const mockRawSummary = {
		title: 'Test Blueprint',
		imgurId: 'img123',
		imgurType: 'image/png',
		numberOfFavorites: 5,
		lastUpdatedDate: 1625097600000,
	};
	const mockEnrichedSummary = {
		...mockRawSummary,
		key: mockBlueprintId,
		thumbnail: 'https://i.imgur.com/img123b.png',
	};

	beforeEach(() => {
		// Set up mock implementations
		vi.mocked(useRawBlueprintSummary).mockReturnValue({
			data: mockRawSummary,
			isLoading: false,
			isSuccess: true,
			error: null,
		} as any);
		vi.mocked(enrichBlueprintSummary).mockReturnValue(mockEnrichedSummary);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should use the useRawBlueprintSummary hook with the correct parameters', () => {
		renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(useRawBlueprintSummary).toHaveBeenCalledWith(mockBlueprintId);
	});

	it('should enrich the raw blueprint summary data', () => {
		const {result} = renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawSummary, mockBlueprintId);
		expect(result.current.data).toEqual(mockEnrichedSummary);
	});

	it('should return null data if raw data is null', () => {
		vi.mocked(useRawBlueprintSummary).mockReturnValue({
			data: null,
			isLoading: false,
			isSuccess: false,
			error: null,
		} as any);

		const {result} = renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(enrichBlueprintSummary).not.toHaveBeenCalled();
		expect(result.current.data).toBeNull();
	});

	it('should preserve other query properties from useRawBlueprintSummary', () => {
		const mockQueryResult = {
			data: mockRawSummary,
			isLoading: false,
			isSuccess: true,
			error: null,
			refetch: vi.fn(),
			fetchStatus: 'idle',
		} as any;

		vi.mocked(useRawBlueprintSummary).mockReturnValue(mockQueryResult);

		const {result} = renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.isSuccess).toBe(true);
		expect(result.current.error).toBeNull();
		expect(result.current.refetch).toBe(mockQueryResult.refetch);
		expect(result.current.fetchStatus).toBe('idle');
	});
});
