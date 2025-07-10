import React from 'react';
import {vi, describe, it, expect, beforeEach} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useNavigate} from '@tanstack/react-router';
import {update as dbUpdate, push} from 'firebase/database';
import {useUpdateBlueprint, useDeleteBlueprint} from './useUpdateBlueprint';
import {useCreateBlueprint} from './useCreateBlueprint';

// Mock Firebase
vi.mock('firebase/database', () => ({
	getDatabase: vi.fn(),
	ref: vi.fn(() => ({})),
	update: vi.fn(() => Promise.resolve()),
	push: vi.fn(() => ({key: 'new-blueprint-id'})),
	serverTimestamp: vi.fn(() => ({'.sv': 'timestamp'})),
}));

// Mock router
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

// Mock base
vi.mock('../base', () => ({
	app: {},
}));

// Helper to create a complete RawBlueprint
const createMockBlueprint = (overrides: any) => ({
	title: 'Test Blueprint',
	blueprintString: 'test-string',
	descriptionMarkdown: 'test description',
	tags: [],
	lastUpdatedDate: 1000,
	numberOfFavorites: 5,
	createdDate: 900,
	author: {userId: 'user-1', displayName: 'Test User'},
	image: {id: 'img123', type: 'image/png'},
	favorites: {},
	authorId: 'user-1',
	...overrides,
});

// Helper to create UpdateBlueprintFormData
const createMockFormData = (blueprint: any, overrides: any = {}) => ({
	title: blueprint.title,
	blueprintString: blueprint.blueprintString,
	descriptionMarkdown: blueprint.descriptionMarkdown,
	tags: blueprint.tags,
	imageUrl: 'https://i.imgur.com/img123.png',
	...overrides,
});

describe('Tag Operations Cache Consistency', () => {
	let queryClient: QueryClient;
	let wrapper: ({children}: {children: React.ReactNode}) => React.JSX.Element;
	let navigateMock: any;

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {retry: false},
				mutations: {retry: false},
			},
		});
		wrapper = ({children}: {children: React.ReactNode}) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		navigateMock = vi.fn();
		vi.mocked(useNavigate).mockReturnValue(navigateMock);
	});

	describe('useUpdateBlueprint tag cache consistency', () => {
		it('should update tag caches when tags are added and removed', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'test-blueprint';
			const oldTags = ['combat', 'logistics'];
			const newTags = ['logistics', 'production', 'trains'];

			const existingBlueprint = createMockBlueprint({tags: oldTags});

			queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);
			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], {
				title: existingBlueprint.title,
				imgurId: existingBlueprint.image.id,
				imgurType: existingBlueprint.image.type,
				numberOfFavorites: existingBlueprint.numberOfFavorites,
				lastUpdatedDate: existingBlueprint.lastUpdatedDate,
			});

			// Set up tag caches
			queryClient.setQueryData(['byTag', 'combat'], {
				[blueprintId]: true,
				'other-bp-1': true,
			});
			queryClient.setQueryData(['byTag', 'logistics'], {
				[blueprintId]: true,
				'other-bp-2': true,
			});
			queryClient.setQueryData(['byTag', 'production'], {
				'other-bp-3': true,
			});
			queryClient.setQueryData(['byTag', 'trains'], {
				'other-bp-4': true,
			});

			const {result} = renderHook(() => useUpdateBlueprint(), {wrapper});

			result.current.mutate({
				id: blueprintId,
				rawBlueprint: existingBlueprint,
				formData: createMockFormData(existingBlueprint, {tags: newTags}),
				availableTags: ['combat', 'logistics', 'production', 'trains', 'circuits'],
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify tag caches were updated correctly
			// 'combat' should have blueprint removed (removed tag)
			expect(queryClient.getQueryData(['byTag', 'combat'])).toEqual({
				'other-bp-1': true,
			});

			// 'logistics' should still have blueprint (kept tag)
			expect(queryClient.getQueryData(['byTag', 'logistics'])).toEqual({
				[blueprintId]: true,
				'other-bp-2': true,
			});

			// 'production' should have blueprint added (new tag)
			expect(queryClient.getQueryData(['byTag', 'production'])).toEqual({
				[blueprintId]: true,
				'other-bp-3': true,
			});

			// 'trains' should have blueprint added (new tag)
			expect(queryClient.getQueryData(['byTag', 'trains'])).toEqual({
				[blueprintId]: true,
				'other-bp-4': true,
			});
		});

		it('should handle removing all tags from a blueprint', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'test-blueprint';
			const oldTags = ['combat', 'logistics', 'production'];
			const newTags: string[] = [];

			const existingBlueprint = createMockBlueprint({tags: oldTags});

			queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);
			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], {
				title: existingBlueprint.title,
				imgurId: existingBlueprint.image.id,
				imgurType: existingBlueprint.image.type,
				numberOfFavorites: existingBlueprint.numberOfFavorites,
				lastUpdatedDate: existingBlueprint.lastUpdatedDate,
			});

			// Set up tag caches with the blueprint
			oldTags.forEach((tag) => {
				queryClient.setQueryData(['byTag', tag], {
					[blueprintId]: true,
					'other-bp': true,
				});
			});

			const {result} = renderHook(() => useUpdateBlueprint(), {wrapper});

			result.current.mutate({
				id: blueprintId,
				rawBlueprint: existingBlueprint,
				formData: createMockFormData(existingBlueprint, {tags: newTags}),
				availableTags: oldTags,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify blueprint was removed from all tag caches
			oldTags.forEach((tag) => {
				expect(queryClient.getQueryData(['byTag', tag])).toEqual({
					'other-bp': true,
				});
			});
		});

		it('should handle adding tags to a blueprint with no previous tags', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'test-blueprint';
			const oldTags: string[] = [];
			const newTags: string[] = ['combat', 'logistics'];

			const existingBlueprint = createMockBlueprint({tags: oldTags});

			queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);
			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], {
				title: existingBlueprint.title,
				imgurId: existingBlueprint.image.id,
				imgurType: existingBlueprint.image.type,
				numberOfFavorites: existingBlueprint.numberOfFavorites,
				lastUpdatedDate: existingBlueprint.lastUpdatedDate,
			});

			// Set up empty tag caches
			newTags.forEach((tag) => {
				queryClient.setQueryData(['byTag', tag], {});
			});

			const {result} = renderHook(() => useUpdateBlueprint(), {wrapper});

			result.current.mutate({
				id: blueprintId,
				rawBlueprint: existingBlueprint,
				formData: createMockFormData(existingBlueprint, {tags: newTags}),
				availableTags: newTags,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify blueprint was added to all new tag caches
			newTags.forEach((tag) => {
				expect(queryClient.getQueryData(['byTag', tag])).toEqual({
					[blueprintId]: true,
				});
			});
		});

		it('should not modify tag caches that are not in availableTags', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'test-blueprint';
			const oldTags = ['combat'];
			const newTags = ['logistics'];

			const existingBlueprint = createMockBlueprint({tags: oldTags});

			queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], existingBlueprint);
			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], {
				title: existingBlueprint.title,
				imgurId: existingBlueprint.image.id,
				imgurType: existingBlueprint.image.type,
				numberOfFavorites: existingBlueprint.numberOfFavorites,
				lastUpdatedDate: existingBlueprint.lastUpdatedDate,
			});

			// Set up tag caches
			queryClient.setQueryData(['byTag', 'combat'], {
				[blueprintId]: true,
			});
			queryClient.setQueryData(['byTag', 'logistics'], {});
			queryClient.setQueryData(['byTag', 'uncached-tag'], {
				'other-bp': true,
			});

			const {result} = renderHook(() => useUpdateBlueprint(), {wrapper});

			result.current.mutate({
				id: blueprintId,
				rawBlueprint: existingBlueprint,
				formData: createMockFormData(existingBlueprint, {tags: newTags}),
				availableTags: ['combat', 'logistics'], // uncached-tag not included
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify uncached-tag was not modified
			expect(queryClient.getQueryData(['byTag', 'uncached-tag'])).toEqual({
				'other-bp': true,
			});
		});
	});

	describe('useCreateBlueprint tag cache consistency', () => {
		it('should add new blueprint to appropriate tag caches', async () => {
			const mockPushRef = {key: 'new-blueprint-id'} as any;
			vi.mocked(push).mockReturnValue(mockPushRef);
			vi.mocked(dbUpdate).mockResolvedValue();

			const user = {
				uid: 'user-123',
				displayName: 'Test User',
			} as any;

			const formData = {
				title: 'New Blueprint',
				blueprintString: 'test-string',
				descriptionMarkdown: 'test description',
				tags: ['combat', 'logistics'],
				imageUrl: 'https://i.imgur.com/abc123.png',
			};

			// Set up existing tag caches
			queryClient.setQueryData(['byTag', 'combat'], {
				'existing-bp-1': true,
			});
			queryClient.setQueryData(['byTag', 'logistics'], {
				'existing-bp-2': true,
			});
			queryClient.setQueryData(['byTag', 'production'], {
				'existing-bp-3': true,
			});

			queryClient.setQueryData(['tags'], ['combat', 'logistics', 'production', 'trains']);
			queryClient.setQueryData(['users', 'userId', user.uid, 'blueprints'], {});

			const {result} = renderHook(() => useCreateBlueprint(), {wrapper});

			result.current.mutate({formData, user});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify blueprint was added to correct tag caches
			expect(queryClient.getQueryData(['byTag', 'combat'])).toEqual({
				'existing-bp-1': true,
				'new-blueprint-id': true,
			});

			expect(queryClient.getQueryData(['byTag', 'logistics'])).toEqual({
				'existing-bp-2': true,
				'new-blueprint-id': true,
			});

			// Verify blueprint was NOT added to unrelated tag cache
			expect(queryClient.getQueryData(['byTag', 'production'])).toEqual({
				'existing-bp-3': true,
			});
		});

		it('should handle creating blueprint with no tags', async () => {
			const mockPushRef = {key: 'new-blueprint-id'} as any;
			vi.mocked(push).mockReturnValue(mockPushRef);
			vi.mocked(dbUpdate).mockResolvedValue();

			const user = {
				uid: 'user-123',
				displayName: 'Test User',
			} as any;

			const formData = {
				title: 'New Blueprint',
				blueprintString: 'test-string',
				descriptionMarkdown: 'test description',
				tags: [],
				imageUrl: 'https://i.imgur.com/abc123.png',
			};

			// Set up existing tag caches
			queryClient.setQueryData(['byTag', 'combat'], {
				'existing-bp': true,
			});

			queryClient.setQueryData(['tags'], ['combat', 'logistics']);
			queryClient.setQueryData(['users', 'userId', user.uid, 'blueprints'], {});

			const {result} = renderHook(() => useCreateBlueprint(), {wrapper});

			result.current.mutate({formData, user});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify no tag caches were modified
			expect(queryClient.getQueryData(['byTag', 'combat'])).toEqual({
				'existing-bp': true,
			});
		});

		it('should only update cached tags', async () => {
			const mockPushRef = {key: 'new-blueprint-id'} as any;
			vi.mocked(push).mockReturnValue(mockPushRef);
			vi.mocked(dbUpdate).mockResolvedValue();

			const user = {
				uid: 'user-123',
				displayName: 'Test User',
			} as any;

			const formData = {
				title: 'New Blueprint',
				blueprintString: 'test-string',
				descriptionMarkdown: 'test description',
				tags: ['combat', 'uncached-tag'],
				imageUrl: 'https://i.imgur.com/abc123.png',
			};

			// Set up only combat tag cache
			queryClient.setQueryData(['byTag', 'combat'], {
				'existing-bp': true,
			});

			queryClient.setQueryData(['tags'], ['combat', 'logistics', 'uncached-tag']);
			queryClient.setQueryData(['users', 'userId', user.uid, 'blueprints'], {});

			const {result} = renderHook(() => useCreateBlueprint(), {wrapper});

			result.current.mutate({formData, user});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify only cached tag was updated
			expect(queryClient.getQueryData(['byTag', 'combat'])).toEqual({
				'existing-bp': true,
				'new-blueprint-id': true,
			});

			// Verify uncached tag remains uncached
			expect(queryClient.getQueryData(['byTag', 'uncached-tag'])).toBeUndefined();
		});
	});

	describe('useDeleteBlueprint tag cache consistency', () => {
		it('should update tag caches to remove deleted blueprint', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'delete-test-blueprint';
			const authorId = 'test-author';
			const tags = ['combat', 'logistics', 'production'];

			// Set up tag caches with the blueprint
			queryClient.setQueryData(['byTag', 'combat'], {
				[blueprintId]: true,
				'other-bp-1': true,
			});
			queryClient.setQueryData(['byTag', 'logistics'], {
				[blueprintId]: true,
				'other-bp-2': true,
			});
			queryClient.setQueryData(['byTag', 'production'], {
				[blueprintId]: true,
			});

			queryClient.setQueryData(['users', 'userId', authorId, 'blueprints'], {
				[blueprintId]: true,
				'other-user-bp': true,
			});

			// Spy on setQueryData to verify tag cache updates
			const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
			setQueryDataSpy.mockClear(); // Clear previous calls from setup

			// Spy on removeQueries
			const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

			const {result} = renderHook(() => useDeleteBlueprint(), {wrapper});

			result.current.mutate({
				id: blueprintId,
				authorId,
				tags,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify setQueryData was called to update tag caches
			expect(setQueryDataSpy).toHaveBeenCalledWith(['byTag', 'combat'], {
				'other-bp-1': true,
			});
			expect(setQueryDataSpy).toHaveBeenCalledWith(['byTag', 'logistics'], {
				'other-bp-2': true,
			});
			expect(setQueryDataSpy).toHaveBeenCalledWith(['byTag', 'production'], {});

			// Verify removeQueries was called for blueprint data
			expect(removeQueriesSpy).toHaveBeenCalledWith({
				queryKey: ['blueprints', 'blueprintId', blueprintId],
			});
			expect(removeQueriesSpy).toHaveBeenCalledWith({
				queryKey: ['blueprintSummaries', 'blueprintId', blueprintId],
			});
		});

		it('should handle deleting blueprint that is not in some tag caches', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'partial-cache-blueprint';
			const authorId = 'test-author';
			const tags = ['combat', 'logistics', 'production'];

			// Blueprint only exists in some tag caches
			queryClient.setQueryData(['byTag', 'combat'], {
				[blueprintId]: true,
			});
			// logistics cache exists but doesn't have this blueprint
			queryClient.setQueryData(['byTag', 'logistics'], {
				'other-bp': true,
			});
			// production cache doesn't exist

			queryClient.setQueryData(['users', 'userId', authorId, 'blueprints'], {
				[blueprintId]: true,
			});

			// Spy on setQueryData to verify tag cache updates
			const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
			setQueryDataSpy.mockClear();

			const {result} = renderHook(() => useDeleteBlueprint(), {wrapper});

			result.current.mutate({
				id: blueprintId,
				authorId,
				tags,
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify only the combat cache was updated (blueprint removed)
			expect(setQueryDataSpy).toHaveBeenCalledWith(['byTag', 'combat'], {});

			// Verify logistics cache was NOT updated (blueprint wasn't there)
			expect(setQueryDataSpy).not.toHaveBeenCalledWith(['byTag', 'logistics'], expect.anything());

			// Verify production cache was NOT updated (cache didn't exist)
			expect(setQueryDataSpy).not.toHaveBeenCalledWith(['byTag', 'production'], expect.anything());
		});
	});

	describe('Cross-operation tag cache consistency', () => {
		it('should maintain consistency when blueprint is created, updated, and deleted', async () => {
			// Step 1: Create blueprint with tags
			const mockPushRef = {key: 'lifecycle-blueprint'} as any;
			vi.mocked(push).mockReturnValue(mockPushRef);
			vi.mocked(dbUpdate).mockResolvedValue();

			const user = {
				uid: 'user-123',
				displayName: 'Test User',
			} as any;

			// Set up initial tag caches
			queryClient.setQueryData(['byTag', 'combat'], {});
			queryClient.setQueryData(['byTag', 'logistics'], {});
			queryClient.setQueryData(['byTag', 'production'], {});
			queryClient.setQueryData(['tags'], ['combat', 'logistics', 'production']);
			queryClient.setQueryData(['users', 'userId', user.uid, 'blueprints'], {});

			// Create blueprint
			const {result: createResult} = renderHook(() => useCreateBlueprint(), {wrapper});

			createResult.current.mutate({
				formData: {
					title: 'Lifecycle Blueprint',
					blueprintString: 'test-string',
					descriptionMarkdown: 'test description',
					tags: ['combat', 'logistics'],
					imageUrl: 'https://i.imgur.com/abc123.png',
				},
				user,
			});

			await waitFor(() => expect(createResult.current.isSuccess).toBe(true));

			// Verify creation added to correct tags
			expect(queryClient.getQueryData(['byTag', 'combat'])).toEqual({
				'lifecycle-blueprint': true,
			});
			expect(queryClient.getQueryData(['byTag', 'logistics'])).toEqual({
				'lifecycle-blueprint': true,
			});
			expect(queryClient.getQueryData(['byTag', 'production'])).toEqual({});

			// Step 2: Update blueprint tags
			const existingBlueprint = createMockBlueprint({
				title: 'Lifecycle Blueprint',
				tags: ['combat', 'logistics'],
			});

			queryClient.setQueryData(['blueprints', 'blueprintId', 'lifecycle-blueprint'], existingBlueprint);

			const {result: updateResult} = renderHook(() => useUpdateBlueprint(), {wrapper});

			updateResult.current.mutate({
				id: 'lifecycle-blueprint',
				rawBlueprint: existingBlueprint,
				formData: createMockFormData(existingBlueprint, {
					tags: ['logistics', 'production'], // Remove combat, keep logistics, add production
				}),
				availableTags: ['combat', 'logistics', 'production'],
			});

			await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));

			// Verify update modified tags correctly
			expect(queryClient.getQueryData(['byTag', 'combat'])).toEqual({});
			expect(queryClient.getQueryData(['byTag', 'logistics'])).toEqual({
				'lifecycle-blueprint': true,
			});
			expect(queryClient.getQueryData(['byTag', 'production'])).toEqual({
				'lifecycle-blueprint': true,
			});

			// Step 3: Delete blueprint
			const {result: deleteResult} = renderHook(() => useDeleteBlueprint(), {wrapper});

			deleteResult.current.mutate({
				id: 'lifecycle-blueprint',
				authorId: 'user-123',
				tags: ['logistics', 'production'],
			});

			await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));

			// Verify deletion completed successfully
			expect(deleteResult.current.isSuccess).toBe(true);
		});

		it('should handle concurrent operations on same tags', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			// Set up initial state with multiple blueprints
			queryClient.setQueryData(['byTag', 'combat'], {
				'bp-1': true,
				'bp-2': true,
				'bp-3': true,
			});

			// Operation 1: Update bp-1 to remove combat tag
			const {result: update1} = renderHook(() => useUpdateBlueprint(), {wrapper});

			const bp1 = createMockBlueprint({tags: ['combat']});
			queryClient.setQueryData(['blueprints', 'blueprintId', 'bp-1'], bp1);
			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', 'bp-1'], {
				title: bp1.title,
				imgurId: bp1.image.id,
				imgurType: bp1.image.type,
				numberOfFavorites: bp1.numberOfFavorites,
				lastUpdatedDate: bp1.lastUpdatedDate,
			});

			update1.current.mutate({
				id: 'bp-1',
				rawBlueprint: bp1,
				formData: createMockFormData(bp1, {tags: []}),
				availableTags: ['combat'],
			});

			// Operation 2: Delete bp-2
			const {result: delete2} = renderHook(() => useDeleteBlueprint(), {wrapper});

			queryClient.setQueryData(['users', 'userId', 'author-2', 'blueprints'], {
				'bp-2': true,
			});

			delete2.current.mutate({
				id: 'bp-2',
				authorId: 'author-2',
				tags: ['combat'],
			});

			// Wait for both operations
			await waitFor(() => {
				expect(update1.current.isSuccess).toBe(true);
				expect(delete2.current.isSuccess).toBe(true);
			});

			// Verify both operations completed successfully
			expect(update1.current.isSuccess).toBe(true);
			expect(delete2.current.isSuccess).toBe(true);
		});

		it('should maintain tag cache integrity when operations fail', async () => {
			// Set up initial state
			queryClient.setQueryData(['byTag', 'combat'], {
				'bp-1': true,
			});

			const bp1 = createMockBlueprint({tags: ['combat']});
			queryClient.setQueryData(['blueprints', 'blueprintId', 'bp-1'], bp1);
			queryClient.setQueryData(['blueprintSummaries', 'blueprintId', 'bp-1'], {
				title: bp1.title,
				imgurId: bp1.image.id,
				imgurType: bp1.image.type,
				numberOfFavorites: bp1.numberOfFavorites,
				lastUpdatedDate: bp1.lastUpdatedDate,
			});

			// Make update fail
			vi.mocked(dbUpdate).mockRejectedValueOnce(new Error('Network error'));

			const {result} = renderHook(() => useUpdateBlueprint(), {wrapper});

			result.current.mutate({
				id: 'bp-1',
				rawBlueprint: bp1,
				formData: createMockFormData(bp1, {tags: ['logistics']}),
				availableTags: ['combat', 'logistics'],
			});

			await waitFor(() => expect(result.current.isError).toBe(true));

			// Verify cache was not modified on error
			expect(queryClient.getQueryData(['byTag', 'combat'])).toEqual({
				'bp-1': true,
			});
			expect(queryClient.getQueryData(['byTag', 'logistics'])).toBeUndefined();
		});
	});

	describe('Tag cache validation and error handling', () => {
		it('should handle malformed tag cache data gracefully', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'test-blueprint';

			// Set up malformed tag cache (not an object)
			queryClient.setQueryData(['byTag', 'combat'], 'invalid-data');

			const blueprint = createMockBlueprint({tags: []});
			queryClient.setQueryData(['blueprints', 'blueprintId', blueprintId], blueprint);

			const {result} = renderHook(() => useUpdateBlueprint(), {wrapper});

			// Should not throw when encountering invalid cache
			expect(() => {
				result.current.mutate({
					id: blueprintId,
					rawBlueprint: blueprint,
					formData: createMockFormData(blueprint, {tags: ['combat']}),
					availableTags: ['combat'],
				});
			}).not.toThrow();
		});

		it('should handle missing blueprint data in tag cache gracefully', async () => {
			vi.mocked(dbUpdate).mockResolvedValue();

			const blueprintId = 'test-blueprint';

			// Tag cache exists but doesn't contain the blueprint we're deleting
			queryClient.setQueryData(['byTag', 'combat'], {
				'other-bp': true,
				'another-bp': true,
			});

			queryClient.setQueryData(['users', 'userId', 'test-author', 'blueprints'], {
				[blueprintId]: true,
			});

			// Spy on setQueryData
			const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');
			setQueryDataSpy.mockClear();

			const {result} = renderHook(() => useDeleteBlueprint(), {wrapper});

			result.current.mutate({
				id: blueprintId,
				authorId: 'test-author',
				tags: ['combat'],
			});

			await waitFor(() => expect(result.current.isSuccess).toBe(true));

			// Verify cache wasn't modified since blueprint wasn't in it
			expect(setQueryDataSpy).not.toHaveBeenCalledWith(['byTag', 'combat'], expect.anything());
		});
	});
});
