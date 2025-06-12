import React from 'react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {getAuth} from 'firebase/auth';
import Create from './Create';
import * as imgurResolver from '../services/imgurResolver';
import * as parseImgurUrl from '../helpers/parseImgurUrl';

vi.mock('../base', () => ({
	app: {
		_getProvider: vi.fn(),
	},
}));
vi.mock('firebase/auth');
vi.mock('firebase/database', () => ({
	getDatabase: vi.fn(() => ({})),
	ref: vi.fn(() => ({})),
	runTransaction: vi.fn(() => Promise.resolve()),
	get: vi.fn(() =>
		Promise.resolve({
			exists: () => false,
			val: () => null,
		}),
	),
	set: vi.fn(() => Promise.resolve()),
	onValue: vi.fn(),
	off: vi.fn(),
}));
vi.mock('react-firebase-hooks/auth', () => ({
	useAuthState: vi.fn(),
}));
vi.mock('../hooks/useCreateBlueprint', () => ({
	useCreateBlueprint: vi.fn(),
}));
vi.mock('../hooks/useTags', () => ({
	useTags: vi.fn(),
}));
vi.mock('../services/imgurResolver', () => ({
	resolveImgurUrl: vi.fn(),
	ImgurResolverError: class ImgurResolverError extends Error {
		constructor(message, code) {
			super(message);
			this.name = 'ImgurResolverError';
			this.code = code;
		}
	},
}));
vi.mock('../helpers/parseImgurUrl');
vi.mock('../localStorage', () => ({
	loadFromStorage: vi.fn(() => null),
	saveToStorage: vi.fn(),
	removeFromStorage: vi.fn(),
	STORAGE_KEYS: {CREATE_FORM: 'create_form'},
}));
vi.mock('../Blueprint', () => ({
	default: vi.fn().mockImplementation(() => ({
		decodedObject: {blueprint: {label: 'Test Blueprint'}},
		getV15Decoded: vi.fn(() => ({
			blueprint: {label: 'Test Blueprint', icons: [{signal: {name: 'transport-belt'}}]},
		})),
		isBlueprint: vi.fn(() => true),
		isBook: vi.fn(() => false),
		isV14: vi.fn(() => false),
		isV15: vi.fn(() => true),
	})),
}));
vi.mock('../helpers/generateTagSuggestions', () => ({
	default: vi.fn(() => []),
}));
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(() => vi.fn()),
}));

const mockUser = {
	uid: 'test-user-123',
	displayName: 'Test User',
	email: 'test@example.com',
};

const mockCreateBlueprint = vi.fn();
const mockUseTags = vi.fn();
const mockUseAuthState = vi.fn();

describe.skip('Create Component - Imgur URL Integration Tests', () => {
	let queryClient;

	beforeEach(async () => {
		vi.clearAllMocks();

		queryClient = new QueryClient({
			defaultOptions: {
				queries: {retry: false},
				mutations: {retry: false},
			},
		});

		vi.mocked(getAuth).mockReturnValue({
			getProvider: vi.fn(),
			currentUser: mockUser,
		});
		vi.mocked(mockUseAuthState).mockReturnValue([mockUser, false, null]);

		mockCreateBlueprint.mockReturnValue({
			mutate: vi.fn(),
			isPending: false,
			isError: false,
			error: null,
		});

		mockUseTags.mockReturnValue({
			data: {tags: ['/belt/', '/balancer/', '/train/']},
			isSuccess: true,
			isLoading: false,
		});

		const {useAuthState} = await import('react-firebase-hooks/auth');
		const {useCreateBlueprint} = await import('../hooks/useCreateBlueprint');
		const {useTags} = await import('../hooks/useTags');

		vi.mocked(useAuthState).mockImplementation(mockUseAuthState);
		vi.mocked(useCreateBlueprint).mockImplementation(() => mockCreateBlueprint());
		vi.mocked(useTags).mockImplementation(() => mockUseTags());
	});

	afterEach(() => {
		queryClient.clear();
	});

	const renderCreate = async () => {
		const result = render(
			<QueryClientProvider client={queryClient}>
				<Create />
			</QueryClientProvider>,
		);

		return result;
	};

	const fillBasicForm = async (imageUrl = '') => {
		const titleInput = screen.getByPlaceholderText('Title');
		const descriptionInput = screen.getByPlaceholderText('Description (plain text or *GitHub Flavored Markdown*)');
		const blueprintInput = screen.getByPlaceholderText('Blueprint String');
		const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');

		fireEvent.change(titleInput, {target: {value: 'Test Blueprint Title'}});
		fireEvent.change(descriptionInput, {target: {value: 'This is a test blueprint description'}});
		fireEvent.change(blueprintInput, {
			target: {
				value: '0eNqVkMEKgzAMht8l5+qoPaie9jKMjTFwWoUa2dLQapl093YOdmNjMHrJ9-f_k5eQu2WaOmfIPBWQ-wn71Ps8H6hN0vWQe9OlaeHPLq7vLq4d5J4pDRKQ1qEOjMZM',
			},
		});

		const tagDropdown = screen.getByRole('combobox');
		fireEvent.mouseDown(tagDropdown);

		await waitFor(() => {
			expect(screen.getByText('/belt/')).toBeInTheDocument();
		});

		const beltTag = screen.getByText('/belt/');
		fireEvent.click(beltTag);
		if (imageUrl) {
			fireEvent.change(imageInput, {target: {value: imageUrl}});
		}

		return {titleInput, descriptionInput, blueprintInput, imageInput};
	};

	it('should render the Create component', async () => {
		await renderCreate();
		expect(screen.getByRole('heading', {name: /create/i})).toBeInTheDocument();
	});

	describe('Valid Imgur URL workflows', () => {
		it('should successfully resolve direct image URL', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'abc123',
					type: 'jpg',
					isDirect: true,
					isFromAlbum: false,
					normalizedUrl: 'https://i.imgur.com/abc123.jpg',
					warnings: [],
				},
			};

			const mockResolvedImage = {
				id: 'abc123',
				type: 'image/jpeg',
				extension: 'jpg',
				width: 800,
				height: 600,
				title: 'Test Image',
				isFromAlbum: false,
				warnings: [],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://i.imgur.com/abc123.jpg'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(
				() => {
					expect(vi.mocked(parseImgurUrl.parseImgurUrl)).toHaveBeenCalledWith(
						'https://i.imgur.com/abc123.jpg',
					);
					expect(vi.mocked(imgurResolver.resolveImgurUrl)).toHaveBeenCalledWith(
						'https://i.imgur.com/abc123.jpg',
					);
				},
				{timeout: 10000},
			);

			await waitFor(() => {
				expect(screen.getByText(/✓ Image resolved: image\/jpeg/)).toBeInTheDocument();
				expect(screen.getByText(/800×600/)).toBeInTheDocument();
			});

			expect(screen.queryByText(/Please enter a valid Imgur URL/)).not.toBeInTheDocument();
		});

		it('should successfully resolve album URL with warnings', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'album123',
					isDirect: false,
					isFromAlbum: true,
					normalizedUrl: 'https://imgur.com/album123',
					warnings: ['Album URL detected - will use first image'],
				},
			};

			const mockResolvedImage = {
				id: 'first123',
				type: 'image/png',
				extension: 'png',
				width: 1920,
				height: 1080,
				title: 'First image from album',
				isFromAlbum: true,
				warnings: ['Image selected from album'],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://imgur.com/a/album123'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/✓ Image resolved: image\/png/)).toBeInTheDocument();
				expect(screen.getByText(/1920×1080/)).toBeInTheDocument();
			});
		});

		it('should handle hash fragment URLs correctly', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'specific123',
					isDirect: false,
					isFromAlbum: true,
					normalizedUrl: 'https://imgur.com/specific123',
					warnings: ['Detected hash fragment in album URL - using hash as image ID'],
				},
			};

			const mockResolvedImage = {
				id: 'specific123',
				type: 'image/gif',
				extension: 'gif',
				width: 400,
				height: 300,
				isFromAlbum: true,
				warnings: [],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://imgur.com/a/album123#specific123'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/✓ Image resolved: image\/gif/)).toBeInTheDocument();
			});
		});
	});

	describe('Error handling workflows', () => {
		it('should handle invalid URL format', async () => {
			const mockParsedUrl = {
				success: false,
				error: 'URL must be from imgur.com domain',
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://example.com/image.jpg'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/URL must be from imgur.com domain/)).toBeInTheDocument();
			});

			expect(vi.mocked(imgurResolver.resolveImgurUrl)).not.toHaveBeenCalled();
		});

		it('should handle API resolver errors', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'notfound',
					isDirect: false,
					isFromAlbum: false,
					normalizedUrl: 'https://imgur.com/notfound',
					warnings: [],
				},
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			const {ImgurResolverError} = await import('../services/imgurResolver');
			vi.mocked(imgurResolver.resolveImgurUrl).mockRejectedValue(
				new ImgurResolverError('Image not found', 'NOT_FOUND'),
			);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://imgur.com/notfound'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/Unable to resolve Imgur URL: Image not found/)).toBeInTheDocument();
			});
		});

		it('should handle network timeout errors', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'timeout',
					isDirect: false,
					isFromAlbum: false,
					normalizedUrl: 'https://imgur.com/timeout',
					warnings: [],
				},
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			const {ImgurResolverError} = await import('../services/imgurResolver');
			vi.mocked(imgurResolver.resolveImgurUrl).mockRejectedValue(
				new ImgurResolverError('Request timed out', 'TIMEOUT'),
			);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://imgur.com/timeout'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/Unable to resolve Imgur URL: Request timed out/)).toBeInTheDocument();
			});
		});

		it('should show loading state during validation', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'loading',
					isDirect: false,
					isFromAlbum: false,
					normalizedUrl: 'https://imgur.com/loading',
					warnings: [],
				},
			};

			// Mock a slow resolution
			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() =>
								resolve({
									id: 'loading',
									type: 'image/jpeg',
									extension: 'jpg',
									isFromAlbum: false,
									warnings: [],
								}),
							1000,
						),
					),
			);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://imgur.com/loading'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/Validating Imgur URL.../)).toBeInTheDocument();
			});

			await waitFor(() => {
				expect(screen.getByText(/✓ Image resolved: image\/jpeg/)).toBeInTheDocument();
				expect(screen.queryByText(/Validating Imgur URL.../)).not.toBeInTheDocument();
			});
		});
	});

	describe('Form submission with resolved image data', () => {
		it('should include resolved image data in submission', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'abc123',
					type: 'jpg',
					isDirect: true,
					isFromAlbum: false,
					normalizedUrl: 'https://i.imgur.com/abc123.jpg',
					warnings: [],
				},
			};

			const mockResolvedImage = {
				id: 'abc123',
				type: 'image/jpeg',
				extension: 'jpg',
				width: 800,
				height: 600,
				title: 'Test Image',
				isFromAlbum: false,
				warnings: [],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			const mockMutate = vi.fn();
			mockCreateBlueprint.mockReturnValue({
				mutate: mockMutate,
				isPending: false,
				isError: false,
				error: null,
			});

			await renderCreate();

			await fillBasicForm('https://i.imgur.com/abc123.jpg');

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/✓ Image resolved: image\/jpeg/)).toBeInTheDocument();
			});

			const submitButton = screen.getByRole('button', {name: /Save/i});
			fireEvent.click(submitButton);

			await waitFor(
				() => {
					expect(mockMutate).toHaveBeenCalled();
				},
				{timeout: 5000},
			);

			expect(mockMutate).toHaveBeenCalledWith(
				expect.objectContaining({
					formData: expect.objectContaining({
						title: 'Test Blueprint Title',
						imageUrl: 'https://i.imgur.com/abc123.jpg',
						resolvedImageData: {
							...mockResolvedImage,
							link: 'https://i.imgur.com/abc123.jpg',
						},
					}),
					user: mockUser,
				}),
				expect.any(Object),
			);
		});

		it('should submit without resolved data if resolution failed', async () => {
			const mockParsedUrl = {
				success: false,
				error: 'Invalid URL format',
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);

			const mockMutate = vi.fn();
			mockCreateBlueprint.mockReturnValue({
				mutate: mockMutate,
				isPending: false,
				isError: false,
				error: null,
			});

			await renderCreate();

			await fillBasicForm();
			const imageInput = screen.getByPlaceholderText('https://imgur.com/kRua41d');
			fireEvent.change(imageInput, {target: {value: 'invalid-url'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			const submitButton = screen.getByRole('button', {name: /Save/i});
			fireEvent.click(submitButton);

			expect(mockMutate).not.toHaveBeenCalled();
		});
	});

	describe('URL clearing and re-validation', () => {
		it('should clear resolved data when URL is emptied', async () => {
			const mockParsedUrl = {
				success: true,
				data: {
					id: 'abc123',
					type: 'jpg',
					isDirect: true,
					isFromAlbum: false,
					normalizedUrl: 'https://i.imgur.com/abc123.jpg',
					warnings: [],
				},
			};

			const mockResolvedImage = {
				id: 'abc123',
				type: 'image/jpeg',
				extension: 'jpg',
				isFromAlbum: false,
				warnings: [],
			};

			vi.mocked(parseImgurUrl.parseImgurUrl).mockReturnValue(mockParsedUrl);
			vi.mocked(imgurResolver.resolveImgurUrl).mockResolvedValue(mockResolvedImage);

			await renderCreate();

			const {imageInput} = await fillBasicForm();

			fireEvent.change(imageInput, {target: {value: 'https://i.imgur.com/abc123.jpg'}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.getByText(/✓ Image resolved: image\/jpeg/)).toBeInTheDocument();
			});

			fireEvent.change(imageInput, {target: {value: ''}});

			// Wait for debounced validation to trigger (500ms debounce in component)
			await new Promise((resolve) => setTimeout(resolve, 600));

			await waitFor(() => {
				expect(screen.queryByText(/✓ Image resolved/)).not.toBeInTheDocument();
			});
		});
	});
});
