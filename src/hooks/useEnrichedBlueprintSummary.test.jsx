import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useEnrichedBlueprintSummary } from './useEnrichedBlueprintSummary';
import { useRawBlueprintSummary } from './useRawBlueprintSummary';
import { enrichBlueprintSummary } from '../utils/enrichBlueprintSummary';

// Mock dependencies
vi.mock('./useRawBlueprintSummary');
vi.mock('../utils/enrichBlueprintSummary');

const createWrapper = () =>
{
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>
			{children}
		</QueryClientProvider>
	);
};

describe('useEnrichedBlueprintSummary', () =>
{
	const mockBlueprintId = 'test-blueprint-123';
	const mockRawSummary = {
		title            : 'Test Blueprint',
		imgurId          : 'img123',
		imgurType        : 'image/png',
		numberOfFavorites: 5,
		lastUpdatedDate  : 1625097600000,
	};
	const mockEnrichedSummary = {
		...mockRawSummary,
		key      : mockBlueprintId,
		thumbnail: 'https://i.imgur.com/img123b.png',
	};

	beforeEach(() =>
	{
		// Set up mock implementations
		useRawBlueprintSummary.mockReturnValue({
			data     : mockRawSummary,
			isLoading: false,
			isSuccess: true,
			error    : null,
		});
		enrichBlueprintSummary.mockReturnValue(mockEnrichedSummary);
	});

	afterEach(() =>
	{
		vi.resetAllMocks();
	});

	it('should use the useRawBlueprintSummary hook with the correct parameters', () =>
	{
		renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(useRawBlueprintSummary).toHaveBeenCalledWith(mockBlueprintId);
	});

	it('should enrich the raw blueprint summary data', () =>
	{
		const { result } = renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawSummary, mockBlueprintId);
		expect(result.current.data).toEqual(mockEnrichedSummary);
	});

	it('should return null data if raw data is null', () =>
	{
		useRawBlueprintSummary.mockReturnValue({
			data     : null,
			isLoading: false,
			isSuccess: false,
			error    : null,
		});

		const { result } = renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(enrichBlueprintSummary).not.toHaveBeenCalled();
		expect(result.current.data).toBeNull();
	});

	it('should preserve other query properties from useRawBlueprintSummary', () =>
	{
		const mockQueryResult = {
			data       : mockRawSummary,
			isLoading  : false,
			isSuccess  : true,
			error      : null,
			refetch    : vi.fn(),
			fetchStatus: 'idle',
		};

		useRawBlueprintSummary.mockReturnValue(mockQueryResult);

		const { result } = renderHook(() => useEnrichedBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		expect(result.current.isLoading).toBe(false);
		expect(result.current.isSuccess).toBe(true);
		expect(result.current.error).toBeNull();
		expect(result.current.refetch).toBe(mockQueryResult.refetch);
		expect(result.current.fetchStatus).toBe('idle');
	});
});
