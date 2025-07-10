import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderHook} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';
import useEnrichedBlueprintSummaries from './useEnrichedBlueprintSummaries';
import useRawBlueprintSummaries from './useRawBlueprintSummaries';
import {enrichBlueprintSummary} from '../utils/enrichBlueprintSummary';

// Mock dependencies
vi.mock('./useRawBlueprintSummaries');
vi.mock('../utils/enrichBlueprintSummary');

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

describe('useEnrichedBlueprintSummaries', () => {
	const mockBlueprintsData = {
		'blueprint-1': true,
		'blueprint-2': true,
	};

	const mockRawSummaries = [
		{
			title: 'Blueprint 1',
			imgurId: 'img1',
			imgurType: 'image/png',
			numberOfFavorites: 5,
		},
		{
			title: 'Blueprint 2',
			imgurId: 'img2',
			imgurType: 'image/png',
			numberOfFavorites: 10,
		},
	];

	const mockEnrichedSummaries = [
		{
			title: 'Blueprint 1',
			imgurId: 'img1',
			imgurType: 'image/png',
			numberOfFavorites: 5,
			key: 'blueprint-1',
			thumbnail: 'https://i.imgur.com/img1b.png',
		},
		{
			title: 'Blueprint 2',
			imgurId: 'img2',
			imgurType: 'image/png',
			numberOfFavorites: 10,
			key: 'blueprint-2',
			thumbnail: 'https://i.imgur.com/img2b.png',
		},
	];

	beforeEach(() => {
		// Set up mock implementations
		vi.mocked(useRawBlueprintSummaries).mockReturnValue({
			queriesByKey: {
				'blueprint-1': {
					data: mockRawSummaries[0],
					isSuccess: true,
				},
				'blueprint-2': {
					data: mockRawSummaries[1],
					isSuccess: true,
				},
			},
			rawBlueprintSummaries: mockRawSummaries,
		} as any);

		vi.mocked(enrichBlueprintSummary).mockImplementation((rawSummary: any, blueprintId: any) => {
			if (blueprintId === 'blueprint-1') {
				return mockEnrichedSummaries[0];
			}
			return mockEnrichedSummaries[1];
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should use useRawBlueprintSummaries to get raw data', () => {
		renderHook(() => useEnrichedBlueprintSummaries(mockBlueprintsData, true), {
			wrapper: createWrapper(),
		});

		expect(useRawBlueprintSummaries).toHaveBeenCalledWith(mockBlueprintsData, true);
	});

	it('should call enrichBlueprintSummary for each raw blueprint summary', () => {
		const {result} = renderHook(() => useEnrichedBlueprintSummaries(mockBlueprintsData, true), {
			wrapper: createWrapper(),
		});

		expect(enrichBlueprintSummary).toHaveBeenCalledTimes(2);
		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawSummaries[0], 'blueprint-1');
		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawSummaries[1], 'blueprint-2');

		expect(result.current.blueprintSummaries).toHaveLength(2);
		expect(result.current.blueprintSummaries).toContain(mockEnrichedSummaries[0]);
		expect(result.current.blueprintSummaries).toContain(mockEnrichedSummaries[1]);
	});

	it('should return queriesByKey from useRawBlueprintSummaries', () => {
		const {result} = renderHook(() => useEnrichedBlueprintSummaries(mockBlueprintsData, true), {
			wrapper: createWrapper(),
		});

		expect(result.current.queriesByKey).toEqual({
			'blueprint-1': {
				data: mockRawSummaries[0],
				isSuccess: true,
			},
			'blueprint-2': {
				data: mockRawSummaries[1],
				isSuccess: true,
			},
		});
	});

	it('should return rawBlueprintSummaries from useRawBlueprintSummaries', () => {
		const {result} = renderHook(() => useEnrichedBlueprintSummaries(mockBlueprintsData, true), {
			wrapper: createWrapper(),
		});

		expect(result.current.rawBlueprintSummaries).toEqual(mockRawSummaries);
	});

	it('should handle unsuccessful queries', () => {
		// Mock one unsuccessful query
		vi.mocked(useRawBlueprintSummaries).mockReturnValue({
			queriesByKey: {
				'blueprint-1': {
					data: mockRawSummaries[0],
					isSuccess: true,
				} as any,
				'blueprint-2': {
					error: new Error('Query failed'),
					isSuccess: false,
					isError: true,
				} as any,
			},
			rawBlueprintSummaries: [mockRawSummaries[0]],
		});

		const {result} = renderHook(() => useEnrichedBlueprintSummaries(mockBlueprintsData, true), {
			wrapper: createWrapper(),
		});

		// Should only enrich successful queries
		expect(enrichBlueprintSummary).toHaveBeenCalledTimes(1);
		expect(enrichBlueprintSummary).toHaveBeenCalledWith(mockRawSummaries[0], 'blueprint-1');

		expect(result.current.blueprintSummaries).toHaveLength(1);
		expect(result.current.blueprintSummaries).toContain(mockEnrichedSummaries[0]);
	});
});
