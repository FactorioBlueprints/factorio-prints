import {faChevronDown, faCog}        from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}             from '@fortawesome/react-fontawesome';
import PropTypes                     from 'prop-types';
import React                         from 'react';
import Button                        from 'react-bootstrap/Button';
import Col                           from 'react-bootstrap/Col';
import Container                     from 'react-bootstrap/Container';
import Row                           from 'react-bootstrap/Row';
import useFilteredBlueprintSummaries from '../hooks/useFilteredBlueprintSummaries';
import {useEnrichedPaginatedSummaries}    from '../hooks/useEnrichedPaginatedSummaries';
import useFlattenedEnrichedPaginatedSummaries from '../hooks/useFlattenedEnrichedPaginatedSummaries';

import * as propTypes from '../propTypes';

import BlueprintThumbnail from './BlueprintThumbnail';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

const MostFavoritedGrid = () =>
{
	const {
		data,
		isLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useEnrichedPaginatedSummaries(60, 'numberOfFavorites');

	const flattenedSummaries = useFlattenedEnrichedPaginatedSummaries(data);
	const filteredSummaries = useFilteredBlueprintSummaries(flattenedSummaries);
	const blueprintSummaries = filteredSummaries;

	if (isLoading)
	{
		return (
			<div className='p-5 rounded-lg jumbotron'>
				<h1 className='display-4'>
					<FontAwesomeIcon icon={faCog} spin />
					{' Loading data'}
				</h1>
			</div>
		);
	}

	return (
		<Container fluid>
			<PageHeader title='Most Favorited' />
			<Row className='search-row'>
				<SearchForm />
				<TagForm />
			</Row>
			<Row className='blueprint-grid-row justify-content-center'>
				{
					blueprintSummaries.map(blueprintSummary =>
						<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />)
				}
			</Row>
			{hasNextPage && (
				<Row className='text-center my-4'>
					<Col>
						<Button
							onClick={fetchNextPage}
							disabled={isFetchingNextPage}
							variant='primary'
							size='lg'
						>
							{isFetchingNextPage ? (
								<>
									<FontAwesomeIcon icon={faCog} spin />
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

MostFavoritedGrid.propTypes = {
	location     : propTypes.locationSchema,
	history      : propTypes.historySchema,
	staticContext: PropTypes.shape({}),
	match        : PropTypes.shape({
		params : PropTypes.shape({}).isRequired,
		path   : PropTypes.string.isRequired,
		url    : PropTypes.string.isRequired,
		isExact: PropTypes.bool.isRequired,
	}),
};

export default MostFavoritedGrid;
