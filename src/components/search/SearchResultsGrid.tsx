import {faSpinner} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type React from 'react';
import Alert from 'react-bootstrap/Alert';
import Row from 'react-bootstrap/Row';

import {useAdvancedSearch} from '../../hooks/useAdvancedSearch';
import RestBlueprintThumbnail from './RestBlueprintThumbnail';
import SearchPagination from './SearchPagination';

const SearchResultsGrid: React.FC = () => {
	const {data, isLoading, isError, error, isFetching} = useAdvancedSearch();

	if (isLoading) {
		return (
			<div className="text-center p-5">
				<FontAwesomeIcon
					icon={faSpinner}
					spin
					size="3x"
				/>
				<p className="mt-3">Searching...</p>
			</div>
		);
	}

	if (isError) {
		return (
			<Alert variant="danger">
				<Alert.Heading>Search Error</Alert.Heading>
				<p>{error instanceof Error ? error.message : 'An error occurred while searching.'}</p>
			</Alert>
		);
	}

	if (!data) {
		return (
			<div className="text-center p-5 text-muted">
				<p>Enter search criteria and click Search to find blueprints.</p>
			</div>
		);
	}

	const {_data: blueprints, _metadata: metadata} = data;
	const numberOfPages = metadata.pagination.numberOfPages;

	if (blueprints.length === 0) {
		return (
			<Alert variant="info">
				<Alert.Heading>No Results</Alert.Heading>
				<p>No blueprints found matching your search criteria.</p>
			</Alert>
		);
	}

	return (
		<div>
			<div className="d-flex justify-content-between align-items-center mb-3">
				<span className="text-muted">
					Page {metadata.pagination.pageNumber} of {numberOfPages}
				</span>
				{isFetching && (
					<span className="text-muted">
						<FontAwesomeIcon
							icon={faSpinner}
							spin
						/>{' '}
						Updating...
					</span>
				)}
			</div>

			<Row className="blueprint-grid justify-content-center g-2">
				{blueprints.map((blueprint) => (
					<RestBlueprintThumbnail
						key={blueprint.key}
						blueprintSummary={blueprint}
					/>
				))}
			</Row>

			<SearchPagination numberOfPages={numberOfPages} />
		</div>
	);
};

export default SearchResultsGrid;
