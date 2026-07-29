import {render} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vite-plus/test';
import {useEnrichedPaginatedSummaries} from '../hooks/useEnrichedPaginatedSummaries';
import BlueprintGrid from './BlueprintGrid';

vi.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span />,
}));

vi.mock('../hooks/useEnrichedPaginatedSummaries');

vi.mock('../hooks/useFilteredBlueprintSummaries', () => ({
	default: () => [],
}));

vi.mock('../hooks/useFlattenedEnrichedPaginatedSummaries', () => ({
	default: () => [],
}));

vi.mock('./PageHeader', () => ({
	default: () => <h1>Most Recent</h1>,
}));

vi.mock('./SearchForm', () => ({
	default: () => null,
}));

vi.mock('./TagForm', () => ({
	default: () => null,
}));

describe('BlueprintGrid', () => {
	beforeEach(() => {
		vi.mocked(useEnrichedPaginatedSummaries).mockReturnValue({
			data: null,
			isLoading: false,
			fetchNextPage: vi.fn(),
			hasNextPage: false,
			isFetchingNextPage: false,
			isPlaceholderData: false,
		} as unknown as ReturnType<typeof useEnrichedPaginatedSummaries>);
	});

	it('requests 60 recent blueprints per page', () => {
		render(<BlueprintGrid />);

		expect(vi.mocked(useEnrichedPaginatedSummaries).mock.calls).toStrictEqual([[60, 'lastUpdatedDate']]);
	});
});
