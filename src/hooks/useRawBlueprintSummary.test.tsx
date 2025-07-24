import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {renderHook, waitFor} from '@testing-library/react';
import type React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fetchBlueprintSummary} from '../api/firebase';
import {useRawBlueprintSummary} from './useRawBlueprintSummary';

// Mock dependencies
vi.mock('../api/firebase');

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

describe('useRawBlueprintSummary', () => {
	const mockBlueprintId = 'test-blueprint-123';
	const mockBlueprintSummary = {
		title: 'Test Blueprint',
		imgurId: 'img123',
		imgurType: 'image/png',
		numberOfFavorites: 5,
		lastUpdatedDate: 1625097600000,
	};

	beforeEach(() => {
		vi.mocked(fetchBlueprintSummary).mockResolvedValue(mockBlueprintSummary);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should fetch and validate the blueprint summary data', async () => {
		const {result} = renderHook(() => useRawBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		// Initial state should be loading
		expect(result.current.isLoading).toBe(true);

		// Wait for query to complete
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetchBlueprintSummary).toHaveBeenCalledWith(mockBlueprintId);
		expect(result.current.data).toEqual(mockBlueprintSummary);
	});

	it('should not fetch data if blueprintId is falsy', async () => {
		const {result} = renderHook(() => useRawBlueprintSummary(null as any), {
			wrapper: createWrapper(),
		});

		// Should not be loading since the query is disabled
		expect(result.current.fetchStatus).toBe('idle');

		expect(fetchBlueprintSummary).not.toHaveBeenCalled();
	});

	it('should handle API errors', async () => {
		const mockError = new Error('API error');
		vi.mocked(fetchBlueprintSummary).mockRejectedValue(mockError);

		const {result} = renderHook(() => useRawBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		// Wait for query to error
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBe(mockError);
	});

	it('should handle validation errors', async () => {
		const mockValidationError = new Error('Invalid raw blueprint summary: Validation error');
		vi.mocked(fetchBlueprintSummary).mockRejectedValue(mockValidationError);

		const {result} = renderHook(() => useRawBlueprintSummary(mockBlueprintId), {
			wrapper: createWrapper(),
		});

		// Wait for query to error
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(result.current.error).toBe(mockValidationError);
	});
});
