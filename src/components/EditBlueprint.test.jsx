import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';
import { HelmetProvider } from 'react-helmet-async';
import EditBlueprint from './EditBlueprint';
import * as imgurResolver from '../services/imgurResolver';
import * as parseImgurUrl from '../helpers/parseImgurUrl';

// Mock dependencies
vi.mock('../base', () => ({
	app: {
		_getProvider: vi.fn(),
	},
}));
vi.mock('firebase/auth');
vi.mock('firebase/database', () => ({
	getDatabase   : vi.fn(() => ({})),
	ref           : vi.fn(() => ({})),
	runTransaction: vi.fn(() => Promise.resolve()),
	get           : vi.fn(() => Promise.resolve({
		exists: () => false,
		val   : () => null,
	})),
	set    : vi.fn(() => Promise.resolve()),
	onValue: vi.fn(),
	off    : vi.fn(),
}));
vi.mock('react-firebase-hooks/auth');
vi.mock('../hooks/useUpdateBlueprint', () => ({
	useUpdateBlueprint: vi.fn(),
	useDeleteBlueprint: vi.fn(),
}));
vi.mock('../hooks/useEnrichedBlueprint');
vi.mock('../hooks/useRawBlueprint');
vi.mock('../hooks/useRawBlueprintSummary');
vi.mock('../hooks/useTags');
vi.mock('../hooks/useModerators');
vi.mock('../services/imgurResolver');
vi.mock('../helpers/parseImgurUrl');
vi.mock('../Blueprint', () => ({
	default: vi.fn().mockImplementation(() => ({
		decodedObject: { blueprint: { label: 'Test Blueprint' } },
		getV15Decoded: vi.fn(() => ({ blueprint: { label: 'Test Blueprint', icons: [] } })),
		isBlueprint  : vi.fn(() => true),
		isBook       : vi.fn(() => false),
		isV14        : vi.fn(() => false),
		isV15        : vi.fn(() => true),
	})),
}));
vi.mock('../helpers/generateTagSuggestions', () => ({
	default: vi.fn(() => []),
}));
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(() => vi.fn()),
	useParams  : vi.fn(() => ({ blueprintId: 'test-blueprint-123' })),
}));

const mockUser = {
	uid        : 'test-user-123',
	displayName: 'Test User',
	email      : 'test@example.com',
};

const mockBlueprint = {
	id                 : 'test-blueprint-123',
	title              : 'Existing Blueprint',
	descriptionMarkdown: 'This is an existing blueprint',
	blueprintString    : '0eNqVkMEKgzAMht8l5-q4fWo66csQioPgtAolstXQ6ph093YOdmNjMHr5c_IlP2E3y7RwzqhzVkDuy9in_mT5wG3Sro_cm75NK386cX136e1B7pnSoABpPerAaMy81S3LNjmuKJtrFgTrxb5xhiyYqrIJGJuDuBVMHTOXP9xLtKGVaENKAoZSkgEJl-JCSjK0bQJF7F0hKBJXiCJ6QvQ=',
	tags               : { '/belt/': true, '/balancer/': true },
	author             : {
		userId     : 'test-user-123',
		displayName: 'Test User',
	},
	image: {
		id    : 'existing123',
		type  : 'image/png',
		width : 800,
		height: 600,
	},
};

const mockBlueprintSummary = {
	title            : 'Existing Blueprint',
	imgurId          : 'existing123',
	imgurType        : 'image/png',
	numberOfFavorites: 5,
};

const mockRawBlueprint = {
	...mockBlueprint,
	createdDate      : 1234567890,
	lastUpdatedDate  : 1234567890,
	numberOfFavorites: 5,
	favorites        : {},
	authorId         : 'test-user-123',
};

describe('EditBlueprint Component - Imgur URL Integration Tests', () =>
{
	let queryClient;

	// Mock hooks
	const mockUpdateBlueprint = vi.fn();
	const mockDeleteBlueprint = vi.fn();
	const mockUseAuthState = vi.fn();
	const mockUseEnrichedBlueprint = vi.fn();
	const mockUseRawBlueprint = vi.fn();
	const mockUseRawBlueprintSummary = vi.fn();
	const mockUseTags = vi.fn();
	const mockUseModerators = vi.fn();

	beforeEach(async () =>
	{
		vi.clearAllMocks();

		queryClient = new QueryClient({
			defaultOptions: {
				queries  : { retry: false },
				mutations: { retry: false },
			},
		});

		// Setup mocks
		vi.mocked(getAuth).mockReturnValue({
			getProvider: vi.fn(),
			currentUser: mockUser,
		});

		mockUseAuthState.mockReturnValue([mockUser, false, null]);

		mockUseEnrichedBlueprint.mockReturnValue({
			data     : mockBlueprint,
			isSuccess: true,
			isLoading: false,
			error    : null,
		});

		mockUseRawBlueprint.mockReturnValue({
			data     : mockRawBlueprint,
			isSuccess: true,
			isLoading: false,
		});

		mockUseRawBlueprintSummary.mockReturnValue({
			data     : mockBlueprintSummary,
			isLoading: false,
		});

		mockUseTags.mockReturnValue({
			data     : { tags: ['/belt/', '/balancer/', '/train/'] },
			isSuccess: true,
			isLoading: false,
		});

		mockUseModerators.mockReturnValue({
			data: false,
		});

		mockUpdateBlueprint.mockReturnValue({
			mutate   : vi.fn(),
			isPending: false,
			isError  : false,
			error    : null,
			reset    : vi.fn(),
		});

		mockDeleteBlueprint.mockReturnValue({
			mutate   : vi.fn(),
			isPending: false,
			isError  : false,
			error    : null,
			reset    : vi.fn(),
		});

		// Import and setup mocks
		const { useAuthState } = await import('react-firebase-hooks/auth');
		const { useUpdateBlueprint, useDeleteBlueprint } = await import('../hooks/useUpdateBlueprint');
		const { useEnrichedBlueprint } = await import('../hooks/useEnrichedBlueprint');
		const { useRawBlueprint } = await import('../hooks/useRawBlueprint');
		const { useRawBlueprintSummary } = await import('../hooks/useRawBlueprintSummary');
		const { useTags } = await import('../hooks/useTags');
		const { useIsModerator } = await import('../hooks/useModerators');

		vi.mocked(useAuthState).mockImplementation(mockUseAuthState);
		vi.mocked(useUpdateBlueprint).mockImplementation(() => mockUpdateBlueprint());
		vi.mocked(useDeleteBlueprint).mockImplementation(() => mockDeleteBlueprint());
		vi.mocked(useEnrichedBlueprint).mockImplementation(() => mockUseEnrichedBlueprint());
		vi.mocked(useRawBlueprint).mockImplementation(() => mockUseRawBlueprint());
		vi.mocked(useRawBlueprintSummary).mockImplementation(() => mockUseRawBlueprintSummary());
		vi.mocked(useTags).mockImplementation(() => mockUseTags());
		vi.mocked(useIsModerator).mockImplementation(() => mockUseModerators());
	});

	afterEach(() =>
	{
		queryClient.clear();
	});

	const renderEdit = async () =>
	{
		const result = render(
			<HelmetProvider>
				<QueryClientProvider client={queryClient}>
					<EditBlueprint />
				</QueryClientProvider>
			</HelmetProvider>,
		);

		return result;
	};

	describe('Loading existing blueprint image data', () =>
	{
		it('should display existing blueprint with legacy image data', async () =>
		{
			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
				expect(screen.getByDisplayValue('This is an existing blueprint')).toBeInTheDocument();
			});

			// Should show old thumbnail section
			expect(screen.getByText('Old screenshot')).toBeInTheDocument();
		});

		it('should display existing blueprint with enhanced image data', async () =>
		{
			const enhancedBlueprint = {
				...mockBlueprint,
				image: {
					id         : 'enhanced123',
					type       : 'image/jpeg',
					extension  : 'jpg',
					width      : 1920,
					height     : 1080,
					title      : 'Enhanced Screenshot',
					isFromAlbum: false,
					warnings   : [],
				},
			};

			mockUseEnrichedBlueprint.mockReturnValue({
				data     : enhancedBlueprint,
				isSuccess: true,
				isLoading: false,
				error    : null,
			});

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
			});

			// Should show old thumbnail with enhanced data
			expect(screen.getByText('Old screenshot')).toBeInTheDocument();
		});
	});

	describe('Updating image URL', () =>
	{
		it('should validate and resolve new image URL', async () =>
		{
			const mockParsedUrl = {
				success: true,
				data   : {
					id           : 'newimage123',
					type         : 'jpg',
					isDirect     : true,
					isFromAlbum  : false,
					normalizedUrl: 'https://i.imgur.com/newimage123.jpg',
					warnings     : [],
				},
			};

			const mockResolvedImage = {
				id         : 'newimage123',
				type       : 'image/jpeg',
				extension  : 'jpg',
				width      : 1600,
				height     : 900,
				title      : 'New Screenshot',
				isFromAlbum: false,
				warnings   : [],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
			});

			// Find and update the image URL field
			const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');
			fireEvent.change(imageInput, { target: { value: 'https://i.imgur.com/newimage123.jpg' } });

			// Wait a bit for debounced validation
			await new Promise(resolve => setTimeout(resolve, 600));

			// Wait for resolution
			await waitFor(() =>
			{
				expect(vi.mocked(parseImgurUrl.parseImgurUrl)).toHaveBeenCalledWith('https://i.imgur.com/newimage123.jpg');
				expect(vi.mocked(imgurResolver.resolveImgurUrl)).toHaveBeenCalledWith('https://i.imgur.com/newimage123.jpg');
			});

			// Should show success indicators
			await waitFor(() =>
			{
				expect(screen.getByText(/✓ Image resolved: image\/jpeg/)).toBeInTheDocument();
				expect(screen.getByText(/1600×900/)).toBeInTheDocument();
			});

			// Should show new attached screenshot section
			expect(screen.getByText('Attached screenshot')).toBeInTheDocument();
		});

		it('should handle validation errors for invalid URLs', async () =>
		{
			const mockParsedUrl = {
				success: false,
				error  : 'URL must be from imgur.com domain',
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
			});

			// Update with invalid URL
			const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');
			fireEvent.change(imageInput, { target: { value: '' } });
			fireEvent.change(imageInput, { target: { value: 'https://example.com/image.jpg' } });

			// Wait for validation
			await act(async () =>
			{
				await new Promise(resolve => setTimeout(resolve, 600));
			});

			// Should show preview error
			await waitFor(() =>
			{
				expect(screen.getByText(/Unable to preview image. Please ensure you're using a valid Imgur URL./)).toBeInTheDocument();
			});

			expect(vi.mocked(imgurResolver.resolveImgurUrl)).not.toHaveBeenCalled();
		});

		it('should handle resolver errors gracefully', async () =>
		{
			const mockParsedUrl = {
				success: true,
				data   : {
					id           : 'notfound123',
					isDirect     : false,
					isFromAlbum  : false,
					normalizedUrl: 'https://imgur.com/notfound123',
					warnings     : [],
				},
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockRejectedValue(
				new imgurResolver.ImgurResolverError('Image not found', 'NOT_FOUND'),
			);

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
			});

			const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');
			fireEvent.change(imageInput, { target: { value: '' } });
			fireEvent.change(imageInput, { target: { value: 'https://imgur.com/notfound123' } });

			await act(async () =>
			{
				await new Promise(resolve => setTimeout(resolve, 600));
			});

			// Should clear resolved data and not show preview
			await waitFor(() =>
			{
				expect(screen.queryByText(/✓ Image resolved/)).not.toBeInTheDocument();
			});
		});
	});

	describe('Form submission with updated image', () =>
	{
		it('should include resolved image data when submitting', async () =>
		{
			const mockParsedUrl = {
				success: true,
				data   : {
					id           : 'newimage123',
					type         : 'jpg',
					isDirect     : true,
					isFromAlbum  : false,
					normalizedUrl: 'https://i.imgur.com/newimage123.jpg',
					warnings     : [],
				},
			};

			const mockResolvedImage = {
				id         : 'newimage123',
				type       : 'image/jpeg',
				extension  : 'jpg',
				width      : 1600,
				height     : 900,
				title      : 'New Screenshot',
				isFromAlbum: false,
				warnings   : [],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			const mockMutate = vi.fn();
			mockUpdateBlueprint.mockReturnValue({
				mutate   : mockMutate,
				isPending: false,
				isError  : false,
				error    : null,
				reset    : vi.fn(),
			});

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
			});

			// Update image URL
			const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');
			fireEvent.change(imageInput, { target: { value: '' } });
			fireEvent.change(imageInput, { target: { value: 'https://i.imgur.com/newimage123.jpg' } });

			// Wait for resolution
			await act(async () =>
			{
				await new Promise(resolve => setTimeout(resolve, 600));
			});

			await waitFor(() =>
			{
				expect(screen.getByText(/✓ Image resolved: image\/jpeg/)).toBeInTheDocument();
			});

			// Submit the form
			const saveButton = screen.getByRole('button', { name: /Save/i });
			fireEvent.click(saveButton);

			// Handle the warning modal by clicking the force save button (red save button in modal)
			await waitFor(() =>
			{
				const buttons = screen.getAllByRole('button', { name: /Save/i });
				expect(buttons.length).toBeGreaterThan(1); // Should have original save + modal save
			});

			// Get all save buttons and click the second one (in the modal)
			const saveButtons = screen.getAllByRole('button', { name: /Save/i });
			const forceSaveButton = saveButtons[1]; // The one in the modal
			fireEvent.click(forceSaveButton);

			// Wait for the mutation to be called
			await waitFor(() =>
			{
				expect(mockMutate).toHaveBeenCalled();
			});

			// Verify mutation was called with resolved image data
			expect(mockMutate).toHaveBeenCalledWith({
				id          : 'test-blueprint-123',
				rawBlueprint: mockRawBlueprint,
				formData    : expect.objectContaining({
					title            : 'Existing Blueprint',
					imageUrl         : 'https://i.imgur.com/newimage123.jpg',
					resolvedImageData: mockResolvedImage,
				}),
				availableTags: ['/belt/', '/balancer/', '/train/'],
			});
		});

		it('should submit without resolved data if no image URL provided', async () =>
		{
			const mockMutate = vi.fn();
			mockUpdateBlueprint.mockReturnValue({
				mutate   : mockMutate,
				isPending: false,
				isError  : false,
				error    : null,
				reset    : vi.fn(),
			});

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
			});

			// Clear image URL
			const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');
			fireEvent.change(imageInput, { target: { value: '' } });

			// Submit the form
			const saveButton = screen.getByRole('button', { name: /Save/i });
			fireEvent.click(saveButton);

			// Handle the warning modal by clicking the force save button
			await waitFor(() =>
			{
				const buttons = screen.getAllByRole('button', { name: /Save/i });
				expect(buttons.length).toBeGreaterThan(1);
			});

			const saveButtons = screen.getAllByRole('button', { name: /Save/i });
			const forceSaveButton = saveButtons[1];
			fireEvent.click(forceSaveButton);

			// Wait for mutation to be called
			await waitFor(() =>
			{
				expect(mockMutate).toHaveBeenCalled();
			});

			// Verify mutation was called without image data
			expect(mockMutate).toHaveBeenCalledWith({
				id          : 'test-blueprint-123',
				rawBlueprint: mockRawBlueprint,
				formData    : expect.objectContaining({
					title            : 'Existing Blueprint',
					imageUrl         : '',
					resolvedImageData: null,
				}),
				availableTags: ['/belt/', '/balancer/', '/train/'],
			});
		});
	});

	describe('Legacy image URL handling', () =>
	{
		it('should handle existing image URL as fallback when resolution fails', async () =>
		{
			// Blueprint with existing image URL
			const blueprintWithImageUrl = {
				...mockBlueprint,
				imageUrl: 'https://imgur.com/existing123',
			};

			const rawBlueprintWithImageUrl = {
				...mockRawBlueprint,
				imageUrl: 'https://imgur.com/existing123',
			};

			mockUseEnrichedBlueprint.mockReturnValue({
				data     : blueprintWithImageUrl,
				isSuccess: true,
				isLoading: false,
				error    : null,
			});

			mockUseRawBlueprint.mockReturnValue({
				data     : rawBlueprintWithImageUrl,
				isSuccess: true,
				isLoading: false,
			});

			const mockParsedUrl = {
				success: true,
				data   : {
					id           : 'existing123',
					isDirect     : false,
					isFromAlbum  : false,
					normalizedUrl: 'https://imgur.com/existing123',
					warnings     : [],
				},
			};

			// Mock resolver failure
			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockRejectedValue(
				new imgurResolver.ImgurResolverError('Server error', 'API_ERROR'),
			);

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('https://imgur.com/existing123')).toBeInTheDocument();
			});

			// Should still show preview using fallback logic
			expect(screen.getByText('Attached screenshot')).toBeInTheDocument();
		});
	});

	describe('Image preview functionality', () =>
	{
		it('should show both old and new image previews when updating', async () =>
		{
			const mockResolvedImage = {
				id         : 'newimage123',
				type       : 'image/jpeg',
				extension  : 'jpg',
				width      : 1600,
				height     : 900,
				isFromAlbum: false,
				warnings   : [],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue({
				success: true,
				data   : {
					id           : 'newimage123',
					type         : 'jpg',
					isDirect     : true,
					isFromAlbum  : false,
					normalizedUrl: 'https://i.imgur.com/newimage123.jpg',
					warnings     : [],
				},
			});
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			await renderEdit();

			await waitFor(() =>
			{
				expect(screen.getByDisplayValue('Existing Blueprint')).toBeInTheDocument();
			});

			// Should show old screenshot
			expect(screen.getByText('Old screenshot')).toBeInTheDocument();

			// Add new image URL
			const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');
			fireEvent.change(imageInput, { target: { value: 'https://i.imgur.com/newimage123.jpg' } });

			await act(async () =>
			{
				await new Promise(resolve => setTimeout(resolve, 600));
			});

			await waitFor(() =>
			{
				expect(screen.getByText(/✓ Image resolved: image\/jpeg/)).toBeInTheDocument();
			});

			// Should show both old and new previews
			expect(screen.getByText('Old screenshot')).toBeInTheDocument();
			expect(screen.getByText('Attached screenshot')).toBeInTheDocument();
		});
	});
});
