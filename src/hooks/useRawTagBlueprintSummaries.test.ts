import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {renderHook, waitFor} from '@testing-library/react';
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fetchBlueprintSummary, fetchByTagData} from '../api/firebase';
import type {RawBlueprintSummary} from '../schemas';
import {useRawTagBlueprintSummaries} from './useRawTagBlueprintSummaries';

vi.mock('../api/firebase');

const mockTagData = {
	blueprint1: true,
	blueprint2: true,
	blueprint3: true,
};

const mockBlueprintSummary1: RawBlueprintSummary = {
	title: 'Test Blueprint 1',
	imgurId: 'img1',
	imgurType: 'image/png',
	numberOfFavorites: 10,
	lastUpdatedDate: 1000,
};

const mockBlueprintSummary2: RawBlueprintSummary = {
	title: 'Test Blueprint 2',
	imgurId: 'img2',
	imgurType: 'image/jpeg',
	numberOfFavorites: 20,
	lastUpdatedDate: 2000,
};

const mockBlueprintSummary3: RawBlueprintSummary = {
	title: 'Test Blueprint 3',
	imgurId: 'img3',
	imgurType: 'image/png',
	numberOfFavorites: 30,
	lastUpdatedDate: 3000,
};

describe('useRawTagBlueprintSummaries', () => {
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
		vi.mocked(fetchByTagData).mockResolvedValue(mockTagData);
		vi.mocked(fetchBlueprintSummary).mockImplementation((blueprintId: string) => {
			switch (blueprintId) {
				case 'blueprint1':
					return Promise.resolve(mockBlueprintSummary1);
				case 'blueprint2':
					return Promise.resolve(mockBlueprintSummary2);
				case 'blueprint3':
					return Promise.resolve(mockBlueprintSummary3);
				default:
					return Promise.reject(new Error(`No mock data for ${blueprintId}`));
			}
		});
	});

	const wrapper = ({children}: {children: React.ReactNode}) =>
		React.createElement(QueryClientProvider, {client: queryClient}, children);

	it('should throw error for tagId starting with slash', () => {
		expect(() => renderHook(() => useRawTagBlueprintSummaries('/invalid-tag'), {wrapper})).toThrow(
			'useRawTagBlueprintSummaries: tagId "/invalid-tag" should not start or end with a slash. The normalized tag id should be used for queries.',
		);
	});

	it('should throw error for tagId ending with slash', () => {
		expect(() => renderHook(() => useRawTagBlueprintSummaries('invalid-tag/'), {wrapper})).toThrow(
			'useRawTagBlueprintSummaries: tagId "invalid-tag/" should not start or end with a slash. The normalized tag id should be used for queries.',
		);
	});

	it('should throw error for tagId both starting and ending with slash', () => {
		expect(() => renderHook(() => useRawTagBlueprintSummaries('/invalid-tag/'), {wrapper})).toThrow(
			'useRawTagBlueprintSummaries: tagId "/invalid-tag/" should not start or end with a slash. The normalized tag id should be used for queries.',
		);
	});

	it('should not fetch when tagId is empty', () => {
		const {result} = renderHook(() => useRawTagBlueprintSummaries(''), {wrapper});

		expect(result.current.tagQuery.isLoading).toBe(false);
		expect(result.current.tagQuery.data).toBeUndefined();
		expect(fetchByTagData).not.toHaveBeenCalled();
	});

	it('should fetch tag data and blueprint summaries successfully', async () => {
		const {result} = renderHook(() => useRawTagBlueprintSummaries('category/subcategory'), {wrapper});

		// Initially loading tag data
		expect(result.current.isLoading).toBe(true);
		expect(result.current.tagQuery.isLoading).toBe(true);

		// Wait for tag query to complete
		await waitFor(() => expect(result.current.tagQuery.isSuccess).toBe(true));

		expect(fetchByTagData).toHaveBeenCalledWith('category/subcategory');
		expect(result.current.tagQuery.data).toEqual(mockTagData);
		expect(result.current.blueprintIds).toEqual(['blueprint1', 'blueprint2', 'blueprint3']);

		// Wait for all blueprint queries to complete
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(fetchBlueprintSummary).toHaveBeenCalledWith('blueprint1');
		expect(fetchBlueprintSummary).toHaveBeenCalledWith('blueprint2');
		expect(fetchBlueprintSummary).toHaveBeenCalledWith('blueprint3');

		// Check blueprint queries structure
		expect(result.current.blueprintQueries['blueprint1'].data).toEqual(mockBlueprintSummary1);
		expect(result.current.blueprintQueries['blueprint2'].data).toEqual(mockBlueprintSummary2);
		expect(result.current.blueprintQueries['blueprint3'].data).toEqual(mockBlueprintSummary3);

		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(result.current.isSuccess).toBe(true);
	});

	it('should handle empty tag data', async () => {
		vi.mocked(fetchByTagData).mockResolvedValue({});

		const {result} = renderHook(() => useRawTagBlueprintSummaries('empty-tag'), {wrapper});

		await waitFor(() => expect(result.current.tagQuery.isSuccess).toBe(true));

		expect(result.current.tagQuery.data).toEqual({});
		expect(result.current.blueprintIds).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
		expect(result.current.isSuccess).toBe(true);

		// No blueprint queries should be made
		expect(fetchBlueprintSummary).not.toHaveBeenCalled();
	});

	it('should handle tag query error', async () => {
		const tagError = new Error('Failed to fetch tag data');
		vi.mocked(fetchByTagData).mockRejectedValue(tagError);

		const {result} = renderHook(() => useRawTagBlueprintSummaries('error-tag'), {wrapper});

		await waitFor(() => expect(result.current.tagQuery.isError).toBe(true));

		expect(result.current.tagQuery.error).toEqual(tagError);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(true);
		expect(result.current.isSuccess).toBe(false);

		// No blueprint queries should be made
		expect(fetchBlueprintSummary).not.toHaveBeenCalled();
	});

	it('should handle blueprint query errors', async () => {
		const blueprintError = new Error('Failed to fetch blueprint summary');
		vi.mocked(fetchBlueprintSummary)
			.mockResolvedValueOnce(mockBlueprintSummary1)
			.mockRejectedValueOnce(blueprintError)
			.mockResolvedValueOnce(mockBlueprintSummary3);

		const {result} = renderHook(() => useRawTagBlueprintSummaries('mixed-results-tag'), {wrapper});

		// Wait for tag query to complete
		await waitFor(() => expect(result.current.tagQuery.isSuccess).toBe(true));

		// Wait for blueprint queries to settle
		await waitFor(() => {
			const queries = Object.values(result.current.blueprintQueries);
			return queries.every((q) => !q.isLoading);
		});

		expect(result.current.blueprintQueries['blueprint1'].isSuccess).toBe(true);
		expect(result.current.blueprintQueries['blueprint1'].data).toEqual(mockBlueprintSummary1);

		expect(result.current.blueprintQueries['blueprint2'].isError).toBe(true);
		expect(result.current.blueprintQueries['blueprint2'].error).toEqual(blueprintError);

		expect(result.current.blueprintQueries['blueprint3'].isSuccess).toBe(true);
		expect(result.current.blueprintQueries['blueprint3'].data).toEqual(mockBlueprintSummary3);

		// Overall status should be error because one blueprint query failed
		expect(result.current.isError).toBe(true);
		expect(result.current.isSuccess).toBe(false);
	});

	it('should not enable blueprint queries until tag query succeeds', async () => {
		// Mock tag query to be slow
		let resolveTagQuery: (value: Record<string, boolean>) => void;
		const tagPromise = new Promise<Record<string, boolean>>((resolve) => {
			resolveTagQuery = resolve;
		});
		vi.mocked(fetchByTagData).mockReturnValue(tagPromise);

		const {result} = renderHook(() => useRawTagBlueprintSummaries('slow-tag'), {wrapper});

		// Tag query should be loading
		expect(result.current.tagQuery.isLoading).toBe(true);
		expect(result.current.isLoading).toBe(true);

		// Blueprint queries should not be enabled yet
		expect(fetchBlueprintSummary).not.toHaveBeenCalled();

		// Complete the tag query
		resolveTagQuery!(mockTagData);
		await waitFor(() => expect(result.current.tagQuery.isSuccess).toBe(true));

		// Now blueprint queries should start
		await waitFor(() => expect(fetchBlueprintSummary).toHaveBeenCalled());
	});

	it('should use correct query keys for caching', async () => {
		const {result} = renderHook(() => useRawTagBlueprintSummaries('cache-test-tag'), {wrapper});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Check that tag data is cached with correct key
		expect(queryClient.getQueryData(['byTag', 'tagId', 'cache-test-tag'])).toEqual(mockTagData);

		// Check that blueprint summaries are cached with correct keys
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint1'])).toEqual(
			mockBlueprintSummary1,
		);
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint2'])).toEqual(
			mockBlueprintSummary2,
		);
		expect(queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'blueprint3'])).toEqual(
			mockBlueprintSummary3,
		);
	});

	it('should return correct structure with all expected properties', async () => {
		const {result} = renderHook(() => useRawTagBlueprintSummaries('structure-test-tag'), {wrapper});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

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
