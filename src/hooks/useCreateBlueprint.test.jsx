import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ref, push, update as dbUpdate } from 'firebase/database';
import { useCreateBlueprint } from './useCreateBlueprint';

// Mock Firebase
vi.mock('firebase/database', () => ({
	getDatabase    : vi.fn(),
	ref            : vi.fn(),
	push           : vi.fn(),
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
	validateRawBlueprintSummary           : vi.fn((data) => data),
	validateRawPaginatedBlueprintSummaries: vi.fn((data) => data),
}));

describe('useCreateBlueprint', () =>
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

	it('should create blueprint with raw data', async () =>
	{
		const mockRef = {};
		const mockNewBlueprintRef = { key: 'newBlueprint123' };
		ref.mockReturnValue(mockRef);
		push.mockReturnValue(mockNewBlueprintRef);
		dbUpdate.mockResolvedValue();

		const formData = {
			title              : 'Test Blueprint',
			blueprintString    : 'test blueprint string',
			descriptionMarkdown: 'test description',
			tags               : ['tag1', 'tag2'],
			imageUrl           : 'https://imgur.com/abc1234',
		};

		const user = {
			uid        : 'user123',
			displayName: 'Test User',
		};

		const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			formData,
			user,
		});

		// Verify Firebase push was called with correct blueprint data
		expect(push).toHaveBeenCalledWith(mockRef, {
			title              : 'Test Blueprint',
			blueprintString    : 'test blueprint string',
			descriptionMarkdown: 'test description',
			tags               : ['tag1', 'tag2'],
			author             : {
				userId     : 'user123',
				displayName: 'Test User',
			},
			authorId         : 'user123',
			createdDate      : 'SERVER_TIMESTAMP',
			lastUpdatedDate  : 'SERVER_TIMESTAMP',
			favorites        : {},
			numberOfFavorites: 0,
			image            : {
				id  : 'abc1234',
				type: 'image/png',
			},
		});

		// Verify Firebase update was called with correct updates
		expect(dbUpdate).toHaveBeenCalledWith(mockRef, {
			'/users/user123/blueprints/newBlueprint123': true,
			'/blueprintSummaries/newBlueprint123'      : {
				imgurId          : 'abc1234',
				imgurType        : 'image/png',
				title            : 'Test Blueprint',
				numberOfFavorites: 0,
				lastUpdatedDate  : 'SERVER_TIMESTAMP',
			},
			'/blueprintsPrivate/newBlueprint123/imageUrl': 'https://imgur.com/abc1234',
			'/byTag/tag1/newBlueprint123'                : true,
			'/byTag/tag2/newBlueprint123'                : true,
		});

		// Verify navigation
		expect(navigateMock).toHaveBeenCalledWith({ to: '/view/newBlueprint123' });
	});

	it('should handle imgur URLs with file extension', async () =>
	{
		const mockRef = {};
		const mockNewBlueprintRef = { key: 'newBlueprint123' };
		ref.mockReturnValue(mockRef);
		push.mockReturnValue(mockNewBlueprintRef);
		dbUpdate.mockResolvedValue();

		const formData = {
			title              : 'Test Blueprint',
			blueprintString    : 'test blueprint string',
			descriptionMarkdown: 'test description',
			tags               : [],
			imageUrl           : 'https://i.imgur.com/xyz5678.png',
		};

		const user = {
			uid        : 'user123',
			displayName: null,
		};

		const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			formData,
			user,
		});

		// Verify the image was processed correctly
		expect(push).toHaveBeenCalledWith(mockRef, expect.objectContaining({
			image: {
				id  : 'xyz5678',
				type: 'image/png',
			},
		}));
	});

	it('should reject invalid image URLs', async () =>
	{
		const formData = {
			title              : 'Test Blueprint',
			blueprintString    : 'test blueprint string',
			descriptionMarkdown: 'test description',
			tags               : [],
			imageUrl           : 'https://invalid-url.com/image',
		};

		const user = {
			uid: 'user123',
		};

		const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

		await expect(result.current.mutateAsync({
			formData,
			user,
		})).rejects.toThrow('Invalid image URL format');
	});

	it('should update cache on success', async () =>
	{
		const mockRef = {};
		const mockNewBlueprintRef = { key: 'newBlueprint123' };
		ref.mockReturnValue(mockRef);
		push.mockReturnValue(mockNewBlueprintRef);
		dbUpdate.mockResolvedValue();

		// Set up existing cache data
		const existingPaginatedData = {
			pages: [
				{
					data: {
						existing1: {
							title            : 'Existing 1',
							lastUpdatedDate  : 1000000,
							imgurId          : 'exist1',
							imgurType        : 'image/png',
							numberOfFavorites: 5,
						},
					},
					lastKey  : 'existing1',
					lastValue: 1000000,
				},
			],
		};

		queryClient.setQueryData(['blueprintSummaries', 'orderByField', 'lastUpdatedDate'], existingPaginatedData);

		const formData = {
			title              : 'New Blueprint',
			blueprintString    : 'new blueprint string',
			descriptionMarkdown: 'new description',
			tags               : ['newTag'],
			imageUrl           : 'https://imgur.com/new1234',
		};

		const user = {
			uid: 'user123',
		};

		const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			formData,
			user,
		});

		// Check summary cache was updated
		const summaryData = queryClient.getQueryData(['blueprintSummaries', 'blueprintId', 'newBlueprint123']);
		expect(summaryData).toEqual({
			title            : 'New Blueprint',
			imgurId          : 'new1234',
			imgurType        : 'image/png',
			numberOfFavorites: 0,
			lastUpdatedDate  : expect.any(Number),
		});

		// Check paginated data was updated
		const paginatedData = queryClient.getQueryData(['blueprintSummaries', 'orderByField', 'lastUpdatedDate']);
		expect(paginatedData.pages[0].data).toHaveProperty('newBlueprint123');
	});

	it('should update user blueprints cache', async () =>
	{
		const mockRef = {};
		const mockNewBlueprintRef = { key: 'newBlueprint123' };
		ref.mockReturnValue(mockRef);
		push.mockReturnValue(mockNewBlueprintRef);
		dbUpdate.mockResolvedValue();

		// Set up existing user blueprints
		queryClient.setQueryData(['users', 'userId', 'user123', 'blueprints'], {
			existing1: true,
			existing2: true,
		});

		const formData = {
			title              : 'Test Blueprint',
			blueprintString    : 'test blueprint string',
			descriptionMarkdown: 'test description',
			tags               : [],
			imageUrl           : 'https://imgur.com/abc1234',
		};

		const user = {
			uid: 'user123',
		};

		const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			formData,
			user,
		});

		// Check user blueprints were updated
		const userBlueprints = queryClient.getQueryData(['users', 'userId', 'user123', 'blueprints']);
		expect(userBlueprints).toEqual({
			existing1      : true,
			existing2      : true,
			newBlueprint123: true,
		});
	});

	it('should update tag cache', async () =>
	{
		const mockRef = {};
		const mockNewBlueprintRef = { key: 'newBlueprint123' };
		ref.mockReturnValue(mockRef);
		push.mockReturnValue(mockNewBlueprintRef);
		dbUpdate.mockResolvedValue();

		// Set up existing tags and tag data
		queryClient.setQueryData(['tags'], ['tag1', 'tag2', 'tag3']);
		queryClient.setQueryData(['byTag', 'tag1'], { existing1: true });
		queryClient.setQueryData(['byTag', 'tag2'], { existing2: true });

		const formData = {
			title              : 'Test Blueprint',
			blueprintString    : 'test blueprint string',
			descriptionMarkdown: 'test description',
			tags               : ['tag1', 'tag3'],
			imageUrl           : 'https://imgur.com/abc1234',
		};

		const user = {
			uid: 'user123',
		};

		const { result } = renderHook(() => useCreateBlueprint(), { wrapper });

		await result.current.mutateAsync({
			formData,
			user,
		});

		// Check tag caches were updated
		const tag1Data = queryClient.getQueryData(['byTag', 'tag1']);
		expect(tag1Data).toEqual({ existing1: true, newBlueprint123: true });

		const tag2Data = queryClient.getQueryData(['byTag', 'tag2']);
		expect(tag2Data).toEqual({ existing2: true });
	});
});
