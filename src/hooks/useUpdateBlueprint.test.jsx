import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ref, update as dbUpdate } from 'firebase/database';
import { useUpdateBlueprint } from './useUpdateBlueprint';

// Mock Firebase
vi.mock('firebase/database', () => ({
	getDatabase    : vi.fn(),
	ref            : vi.fn(),
	update         : vi.fn(),
	serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

// Mock router
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

// Mock base
vi.mock('../base', () => ({
	app: {},
}));

// Mock schemas
vi.mock('../schemas', () => ({
	validateRawBlueprint       : vi.fn((data) => data),
	validateRawBlueprintSummary: vi.fn((data) => data),
}));

describe('useUpdateBlueprint', () =>
{
	let queryClient;
	let wrapper;
	let navigateMock;

	beforeEach(() =>
	{
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries  : { retry: false },
				mutations: { retry: false },
			},
		});
		wrapper = ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
		navigateMock = vi.fn();
		useNavigate.mockReturnValue(navigateMock);
	});

	it('should update blueprint with raw data', async () =>
	{
		const mockRef = {};
		ref.mockReturnValue(mockRef);
		dbUpdate.mockResolvedValue();

		const rawBlueprint = {
			title              : 'Old Title',
			blueprintString    : 'old string',
			descriptionMarkdown: 'old description',
			tags               : ['old-tag'],
			image              : { id: 'oldImageId', type: 'image/png' },
			author             : { userId: 'user123', displayName: 'Test User' },
		};

		const formData = {
			title              : 'New Title',
			blueprintString    : 'new string',
			descriptionMarkdown: 'new description',
			tags               : ['new-tag'],
			imageUrl           : 'https://imgur.com/abc1234',
		};

		const { result } = renderHook(() => useUpdateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			id           : 'blueprint123',
			rawBlueprint,
			formData,
			availableTags: ['old-tag', 'new-tag'],
		});

		// Verify Firebase update was called with correct data
		expect(dbUpdate).toHaveBeenCalledWith(mockRef, {
			'/blueprints/blueprint123/title'                   : 'New Title',
			'/blueprints/blueprint123/blueprintString'         : 'new string',
			'/blueprints/blueprint123/descriptionMarkdown'     : 'new description',
			'/blueprints/blueprint123/tags'                    : ['new-tag'],
			'/blueprints/blueprint123/lastUpdatedDate'         : 'SERVER_TIMESTAMP',
			'/blueprints/blueprint123/image'                   : { id: 'abc1234', type: 'image/png' },
			'/blueprintSummaries/blueprint123/title/'          : 'New Title',
			'/blueprintSummaries/blueprint123/lastUpdatedDate/': 'SERVER_TIMESTAMP',
			'/blueprintSummaries/blueprint123/imgurId/'        : 'abc1234',
			'/blueprintSummaries/blueprint123/imgurType/'      : 'image/png',
			'/byTag/old-tag/blueprint123'                      : null,
			'/byTag/new-tag/blueprint123'                      : true,
		});

		// Verify navigation
		expect(navigateMock).toHaveBeenCalledWith({ to: '/view/$blueprintId', params: { blueprintId: 'blueprint123' }, from: '/edit/$blueprintId' });
	});

	it('should handle update without image change', async () =>
	{
		const mockRef = {};
		ref.mockReturnValue(mockRef);
		dbUpdate.mockResolvedValue();

		const rawBlueprint = {
			title              : 'Old Title',
			blueprintString    : 'old string',
			descriptionMarkdown: 'old description',
			tags               : ['old-tag'],
			image              : { id: 'same123', type: 'image/png' },
		};

		const formData = {
			title              : 'New Title',
			blueprintString    : 'new string',
			descriptionMarkdown: 'new description',
			tags               : ['new-tag'],
			imageUrl           : 'https://imgur.com/same123',
		};

		const { result } = renderHook(() => useUpdateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			id           : 'blueprint123',
			rawBlueprint,
			formData,
			availableTags: ['old-tag', 'new-tag'],
		});

		// Verify Firebase update was called without image update
		const updateCalls = dbUpdate.mock.calls[0][1];
		expect(updateCalls['/blueprints/blueprint123/image']).toBeUndefined();
		expect(updateCalls['/blueprintSummaries/blueprint123/imgurId/']).toBeUndefined();
		expect(updateCalls['/blueprintSummaries/blueprint123/imgurType/']).toBeUndefined();
	});

	it('should update cache on success', async () =>
	{
		const mockRef = {};
		ref.mockReturnValue(mockRef);
		dbUpdate.mockResolvedValue();

		const existingBlueprint = {
			title              : 'Old Title',
			blueprintString    : 'old string',
			descriptionMarkdown: 'old description',
			tags               : ['old-tag'],
			lastUpdatedDate    : 1000000,
		};

		queryClient.setQueryData(['blueprints', 'blueprintId', 'blueprint123'], existingBlueprint);

		const formData = {
			title              : 'New Title',
			blueprintString    : 'new string',
			descriptionMarkdown: 'new description',
			tags               : ['new-tag'],
			imageUrl           : '',
		};

		const { result } = renderHook(() => useUpdateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			id           : 'blueprint123',
			rawBlueprint : existingBlueprint,
			formData,
			availableTags: ['old-tag'],
		});

		// Check cache was updated
		const updatedBlueprint = queryClient.getQueryData(['blueprints', 'blueprintId', 'blueprint123']);
		expect(updatedBlueprint.title).toBe('New Title');
		expect(updatedBlueprint.blueprintString).toBe('new string');
		expect(updatedBlueprint.descriptionMarkdown).toBe('new description');
		expect(updatedBlueprint.tags).toEqual(['new-tag']);
		expect(updatedBlueprint.lastUpdatedDate).toBeGreaterThan(1000000);
	});
});
