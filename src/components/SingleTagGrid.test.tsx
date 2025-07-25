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
	useParams: vi.fn(() => ({category: 'test', name: 'tag'})),
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
	default: ({title}: {title: React.ReactNode}) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('./SearchForm', () => ({
	default: () => <div data-testid="search-form">Search Form</div>,
}));

vi.mock('./TagForm', () => ({
	default: () => <div data-testid="tag-form">Tag Form</div>,
}));

const mockBlueprintSummary = (id: string): EnrichedBlueprintSummary => ({
	key: id,
	title: `Blueprint ${id}`,
	imgurId: `imgur-${id}`,
	imgurType: 'image/png',
	numberOfFavorites: 10,
	lastUpdatedDate: Date.now(),
	thumbnail: `thumbnail-${id}`,
});

describe('SingleTagGrid', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});

		// Set default return value for useFilterByTitle
		vi.mocked(useFilterByTitle).mockImplementation((summaries) => summaries || []);
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

		expect(screen.getByText(/Loading data/)).toBeInTheDocument();
	});

	it('should render grid components when not loading', () => {
		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: {},
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: [],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);
		vi.mocked(useFilterByTitle).mockReturnValue([]);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('page-header')).toBeInTheDocument();
		expect(screen.getByTestId('search-form')).toBeInTheDocument();
		expect(screen.getByTestId('tag-form')).toBeInTheDocument();
	});

	it('should render blueprints when available', () => {
		const mockBlueprints = [mockBlueprintSummary('1'), mockBlueprintSummary('2'), mockBlueprintSummary('3')];

		const mockQueries = {
			'1': {isSuccess: true, data: mockBlueprints[0]},
			'2': {isSuccess: true, data: mockBlueprints[1]},
			'3': {isSuccess: true, data: mockBlueprints[2]},
		};

		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: mockQueries,
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['1', '2', '3'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);
		vi.mocked(useFilterByTitle).mockReturnValue(mockBlueprints);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('blueprint-thumbnail-1')).toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-2')).toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-3')).toBeInTheDocument();
	});

	it('should sort blueprints by date', () => {
		const oldBlueprint = {...mockBlueprintSummary('old'), lastUpdatedDate: 1000};
		const newBlueprint = {...mockBlueprintSummary('new'), lastUpdatedDate: 2000};
		const newestBlueprint = {...mockBlueprintSummary('newest'), lastUpdatedDate: 3000};

		const mockQueries = {
			old: {isSuccess: true, data: oldBlueprint},
			new: {isSuccess: true, data: newBlueprint},
			newest: {isSuccess: true, data: newestBlueprint},
		};

		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: mockQueries,
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['old', 'new', 'newest'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);
		vi.mocked(useFilterByTitle).mockReturnValue([oldBlueprint, newBlueprint, newestBlueprint]);

		const {container} = render(<SingleTagGrid />, {wrapper});

		const thumbnails = container.querySelectorAll('[data-testid^="blueprint-thumbnail-"]');
		expect(thumbnails[0]).toHaveAttribute('data-testid', 'blueprint-thumbnail-newest');
		expect(thumbnails[1]).toHaveAttribute('data-testid', 'blueprint-thumbnail-new');
		expect(thumbnails[2]).toHaveAttribute('data-testid', 'blueprint-thumbnail-old');
	});

	it('should filter blueprints', () => {
		const blueprint1 = mockBlueprintSummary('1');
		const blueprint2 = mockBlueprintSummary('2');
		const blueprint3 = mockBlueprintSummary('3');

		const mockQueries = {
			'1': {isSuccess: true, data: blueprint1},
			'2': {isSuccess: true, data: blueprint2},
			'3': {isSuccess: true, data: blueprint3},
		};

		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: mockQueries,
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['1', '2', '3'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);
		// Mock filter to only return first two blueprints
		vi.mocked(useFilterByTitle).mockReturnValue([blueprint1, blueprint2]);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('blueprint-thumbnail-1')).toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-2')).toBeInTheDocument();
		expect(screen.queryByTestId('blueprint-thumbnail-3')).not.toBeInTheDocument();
	});

	it('should display formatted tag in header', () => {
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

		expect(screen.getByTestId('page-header')).toHaveTextContent('test › tag');
	});

	it('should handle blueprints with null or undefined data', () => {
		const mockQueries = {
			'1': {isSuccess: true, data: mockBlueprintSummary('1')},
			'2': {isSuccess: true, data: null},
			'3': {isSuccess: false, data: undefined},
			'4': {isSuccess: true, data: mockBlueprintSummary('4')},
		};

		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: mockQueries,
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['1', '2', '3', '4'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);
		vi.mocked(useFilterByTitle).mockReturnValue([mockBlueprintSummary('1'), mockBlueprintSummary('4')]);

		render(<SingleTagGrid />, {wrapper});

		expect(screen.getByTestId('blueprint-thumbnail-1')).toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-4')).toBeInTheDocument();
		expect(screen.queryByTestId('blueprint-thumbnail-2')).not.toBeInTheDocument();
		expect(screen.queryByTestId('blueprint-thumbnail-3')).not.toBeInTheDocument();
	});

	it('should handle blueprints without dates', () => {
		const blueprint1 = {...mockBlueprintSummary('1'), lastUpdatedDate: undefined};
		const blueprint2 = {...mockBlueprintSummary('2'), lastUpdatedDate: 1000};

		const mockQueries = {
			'1': {isSuccess: true, data: blueprint1},
			'2': {isSuccess: true, data: blueprint2},
		};

		const mockResult = {
			tagQuery: {isSuccess: true, error: null},
			blueprintQueries: mockQueries,
			isLoading: false,
			isError: false,
			isSuccess: true,
			blueprintIds: ['1', '2'],
		} as any;

		vi.mocked(useEnrichedTagBlueprintSummaries).mockReturnValue(mockResult);
		vi.mocked(useFilterByTitle).mockReturnValue([blueprint1, blueprint2]);

		render(<SingleTagGrid />, {wrapper});

		// Should still render both blueprints
		expect(screen.getByTestId('blueprint-thumbnail-1')).toBeInTheDocument();
		expect(screen.getByTestId('blueprint-thumbnail-2')).toBeInTheDocument();
	});
});
