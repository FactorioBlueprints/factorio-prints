import {faChevronDown, faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import useFilteredBlueprintSummaries from '../hooks/useFilteredBlueprintSummaries';
import {useEnrichedPaginatedSummaries} from '../hooks/useEnrichedPaginatedSummaries';
import useFlattenedEnrichedPaginatedSummaries from '../hooks/useFlattenedEnrichedPaginatedSummaries';

import BlueprintThumbnail from './BlueprintThumbnail';
import PageHeader from './PageHeader';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

const MostFavoritedGrid: React.FC = () => {
	const {data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData} =
		useEnrichedPaginatedSummaries(60, 'numberOfFavorites');

	const flattenedSummaries = useFlattenedEnrichedPaginatedSummaries(data);
	const filteredSummaries = useFilteredBlueprintSummaries(flattenedSummaries);
	const blueprintSummaries = filteredSummaries;

	if (isLoading) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">
					<FontAwesomeIcon
						icon={faCog}
						spin
					/>
					{' Loading data'}
				</h1>
			</div>
		);
	}

	return (
		<Container fluid>
			<PageHeader title="Most Favorited" />
			<Row className="search-row">
				<SearchForm />
				<TagForm />
			</Row>
			<Row className="blueprint-grid-row justify-content-center">
				{blueprintSummaries.map((blueprintSummary) => (
					<BlueprintThumbnail
						key={blueprintSummary.key}
						blueprintSummary={blueprintSummary}
					/>
				))}
			</Row>
			{hasNextPage && (
				<Row className="text-center my-4">
					<Col>
						<Button
							onClick={() => fetchNextPage()}
							disabled={isFetchingNextPage || isPlaceholderData}
							variant="primary"
							size="lg"
						>
							{isFetchingNextPage ? (
								<>
									<FontAwesomeIcon
										icon={faCog}
										spin
									/>
									{' Loading more...'}
								</>
							) : (
								<>
									<FontAwesomeIcon icon={faChevronDown} />
									{' Load More'}
								</>
							)}
						</Button>
					</Col>
				</Row>
			)}
		</Container>
	);
};

export default MostFavoritedGrid;
