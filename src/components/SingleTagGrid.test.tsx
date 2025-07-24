import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen} from '@testing-library/react';
import type React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useEnrichedTagBlueprintSummaries} from '../hooks/useEnrichedTagBlueprintSummaries';
import {useFilterByTitle} from '../hooks/useFilterByTitle';
import type {EnrichedBlueprintSummary} from '../schemas';
import SingleTagGrid from './SingleTagGrid';

// Mock the router params
vi.mock('@tanstack/react-router', () => ({
	useParams: vi.fn(() => ({tag: 'test/tag'})),
	useNavigate: vi.fn(() => vi.fn()),
}));

// Mock the hooks
vi.mock('../hooks/useEnrichedTagBlueprintSummaries');
vi.mock('../hooks/useFilterByTitle');

// Mock the components
vi.mock('./BlueprintThumbnail', () => ({
	default: ({blueprintSummary}: {blueprintSummary: EnrichedBlueprintSummary}) => (
		<div data-testid={`blueprint-thumbnail-${blueprintSummary.key}`}>{blueprintSummary.title}</div>
	),
}));

vi.mock('./PageHeader', () => ({
	default: ({title}: {title: string}) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('./SearchForm', () => ({
	default: () => <div data-testid="search-form">Search Form</div>,
}));

vi.mock('./SingleTagSelector', () => ({
	default: ({currentTag}: {currentTag: string}) => (
		<div
			data-testid="single-tag-selector"
			data-current-tag={currentTag}
		>
			Tag Selector
		</div>
	),
}));

vi.mock('./grid/LoadingIndicator', () => ({
	default: ({isLoading, message}: {isLoading: boolean; message: string}) =>
		isLoading ? <div data-testid="loading-indicator">{message}</div> : null,
}));

vi.mock('./grid/ErrorDisplay', () => ({
	default: ({error, message}: {error: any; message: string}) =>
		error ? <div data-testid="error-display">{message}</div> : null,
}));

vi.mock('./grid/EmptyResults', () => ({
	default: ({isEmpty, children}: {isEmpty: boolean; children: React.ReactNode}) =>
		isEmpty ? <div data-testid="empty-results">{children}</div> : null,
}));

const mockEnrichedBlueprintSummary1: EnrichedBlueprintSummary = {
	key: 'blueprint1',
	title: 'Test Blueprint 1',
	lastUpdatedDate: 1000,
	thumbnail: 'https://i.imgur.com/img1b.png',
	numberOfFavorites: 10,
	imgurId: 'img1',
	imgurType: 'image/png',
};

const mockEnrichedBlueprintSummary2: EnrichedBlueprintSummary = {
	key: 'blueprint2',
	title: 'Test Blueprint 2',
	lastUpdatedDate: 2000,
	thumbnail: 'https://i.imgur.com/img2b.jpeg',
	numberOfFavorites: 20,
	imgurId: 'img2',
	imgurType: 'image/jpeg',
};

const mockEnrichedBlueprintSummary3: EnrichedBlueprintSummary = {
	key: 'blueprint3',
	title: 'Test Blueprint 3',
	lastUpdatedDate: 500,
	thumbnail: 'https://i.imgur.com/img3b.png',
	numberOfFavorites: 5,
	imgurId: 'img3',
	imgurType: 'image/png',
};

describe('SingleTagGrid', () => {
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

		// Default mock implementation for useFilterByTitle (returns all blueprints)
		vi.mocked(useFilterByTitle).mockImplementation((blueprints) => blueprints || []);
	});

	const wrapper = ({children}: {children: React.ReactNode}) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('should render loading state', () => {
		const mockResult = {
			tagQuery: {isSuccess: false, error: null},
			blueprintQueries: {},
			isLoading: true,
			isError: false,
			isSuccess: false,
			blueprintIds: [],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
		expect(screen.getByTestId('loading-indicator')).toHaveTextContent('Loading blueprints for tag: test › tag...');
	});

	it('should render error state when tag query fails', () => {
		const mockError = new Error('Failed to load tag');
		const mockResult = {
			tagQuery: {isSuccess: false, error: mockError},
			blueprintQueries: {},
			isLoading: false,
			isError: true,
			isSuccess: false,
			blueprintIds: [],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('error-display')).toBeInTheDocument();
		expect(screen.getByTestId('error-display')).toHaveTextContent(
			'There was a problem loading blueprints for tag: test › tag. Please try again later.',
		);
	});

	it('should render empty state when no blueprints found', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: [],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('empty-results')).toBeInTheDocument();
		expect(screen.getByText('No blueprints found with the tag "test › tag".')).toBeInTheDocument();
		expect(screen.getByText(/The URL format for tag browsing is:/)).toBeInTheDocument();
	});

	it('should render blueprints when data is loaded successfully', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {
				blueprint1: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary1,
				},
				blueprint2: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary2,
				},
				blueprint3: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary3,
				},
			},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['blueprint1', 'blueprint2', 'blueprint3'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		// Check that blueprints are rendered
		expect(screen.getByTestId('blueprint-thumbnail-blueprint1')).toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-blueprint2')).toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-blueprint3')).toBeInTheDocument();

		// Check that they contain the correct titles
		expect(screen.getByText('Test Blueprint 1')).toBeInTheDocument();
		expect(screen.getByText('Test Blueprint 2')).toBeInTheDocument();
		expect(screen.getByText('Test Blueprint 3')).toBeInTheDocument();
	});

	it('should sort blueprints by lastUpdatedDate in descending order', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {
				blueprint1: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary1, // lastUpdatedDate: 1000
				},
				blueprint2: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary2, // lastUpdatedDate: 2000
				},
				blueprint3: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary3, // lastUpdatedDate: 500
				},
			},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['blueprint1', 'blueprint2', 'blueprint3'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		const thumbnails = screen.getAllByTestId(/blueprint-thumbnail-/);

		// Check that blueprints are sorted by lastUpdatedDate descending
		// blueprint2 (2000) should be first, blueprint1 (1000) second, blueprint3 (500) last
		expect(thumbnails[0]).toHaveAttribute('data-testid', 'blueprint-thumbnail-blueprint2');
		expect(thumbnails[1]).toHaveAttribute('data-testid', 'blueprint-thumbnail-blueprint1');
		expect(thumbnails[2]).toHaveAttribute('data-testid', 'blueprint-thumbnail-blueprint3');
	});

	it('should filter out unsuccessful blueprint queries', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {
				blueprint1: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary1,
				},
				blueprint2: {
					isSuccess: false,
					data: null,
					error: new Error('Failed to load'),
				},
				blueprint3: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary3,
				},
			},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['blueprint1', 'blueprint2', 'blueprint3'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		// Only successful blueprints should be rendered
		expect(screen.getByTestId('blueprint-thumbnail-blueprint1')).toBeInTheDocument();
		expect(screen.queryByTestId('blueprint-thumbnail-blueprint2')).not.toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-blueprint3')).toBeInTheDocument();
	});

	it('should apply title filter correctly', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {
				blueprint1: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary1,
				},
				blueprint2: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary2,
				},
			},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['blueprint1', 'blueprint2'],
		} as any;

		// Mock filter to only return blueprint1
		vi.mocked(useFilterByTitle).mockImplementation(() => [mockEnrichedBlueprintSummary1]);

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		// Only filtered blueprint should be rendered
		expect(screen.getByTestId('blueprint-thumbnail-blueprint1')).toBeInTheDocument();
		expect(screen.queryByTestId('blueprint-thumbnail-blueprint2')).not.toBeInTheDocument();
	});

	it('should render page header with formatted tag', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: [],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		const pageHeader = screen.getByTestId('page-header');
		expect(pageHeader).toBeInTheDocument();
		// The tag "test/tag" should be formatted as "test › tag"
		expect(pageHeader).toHaveTextContent('test › tag');
	});

	it('should render search form and tag selector', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: [],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('search-form')).toBeInTheDocument();
		expect(screen.getByTestId('single-tag-selector')).toBeInTheDocument();
		expect(screen.getByTestId('single-tag-selector')).toHaveAttribute('data-current-tag', 'test/tag');
	});

	it('should handle blueprints with null or undefined data', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {
				blueprint1: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary1,
				},
				blueprint2: {
					isSuccess: true,
					data: null,
				},
				blueprint3: {
					isSuccess: true,
					data: undefined as any,
				},
			},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['blueprint1', 'blueprint2', 'blueprint3'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		// Only blueprint with data should be rendered
		expect(screen.getByTestId('blueprint-thumbnail-blueprint1')).toBeInTheDocument();
		expect(screen.queryByTestId('blueprint-thumbnail-blueprint2')).not.toBeInTheDocument();
		expect(screen.queryByTestId('blueprint-thumbnail-blueprint3')).not.toBeInTheDocument();
	});

	it('should handle blueprints without lastUpdatedDate', () => {
		const blueprintWithoutDate = {
			...mockEnrichedBlueprintSummary1,
			lastUpdatedDate: null,
		} as any;

		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {
				blueprint1: {
					isSuccess: true,
					data: blueprintWithoutDate,
				},
				blueprint2: {
					isSuccess: true,
					data: mockEnrichedBlueprintSummary2,
				},
			},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['blueprint1', 'blueprint2'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		const thumbnails = screen.getAllByTestId(/blueprint-thumbnail-/);

		// blueprint2 with date should come first, blueprint1 without date should be last
		expect(thumbnails[0]).toHaveAttribute('data-testid', 'blueprint-thumbnail-blueprint2');
		expect(thumbnails[1]).toHaveAttribute('data-testid', 'blueprint-thumbnail-blueprint1');
	});

	it('should handle empty tag parameter', async () => {
		// Override the useParams mock for this test
		const {useParams} = await import('@tanstack/react-router');
		vi.mocked(useParams).mockReturnValue({tag: ''});

		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: [],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);

		render(<SingleTagGrid />, {wrapper});

		// Should still render but with empty tag
		expect(screen.getByTestId('page-header')).toBeInTheDocument();
		expect(screen.getByTestId('single-tag-selector')).toHaveAttribute('data-current-tag', '');
	});
});
