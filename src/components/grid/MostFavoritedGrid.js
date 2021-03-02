import axios                         from 'axios';
import React, {useContext, useState} from 'react';
import Container                     from 'react-bootstrap/Container';
import Row                           from 'react-bootstrap/Row';
import {useQuery}                    from 'react-query';

import SearchContext from '../../context/searchContext';

import BlueprintThumbnail  from '../BlueprintThumbnail';
import LoadingIcon         from '../LoadingIcon';
import PageHeader          from '../PageHeader';
import EfficientSearchForm from '../search/EfficientSearchForm';
import EfficientTagForm    from '../search/EfficientTagForm';
import PaginationControls  from './PaginationControls';

MostFavoritedGrid.propTypes = {};

function MostFavoritedGrid(props)
{
	const [page, setPage]             = useState(1);
	const {titleFilter, selectedTags} = useContext(SearchContext);

	const fetchBlueprintSummaries = async (page = 1, titleFilter, selectedTags) =>
	{
		const url    = `${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/top/page/${page}`;
		const params = new URLSearchParams();
		params.append('title', titleFilter);
		selectedTags.forEach(tag => params.append('tag', tag.value));
		const result = await axios.get(url, {params});
		return result.data;
	};

	const options = {
		keepPreviousData: true,
		placeholderData : {_data: [], _metadata: {pagination: {numberOfPages: 0, pageNumber: 0}}},
	};
	const result  = useQuery(['top', page, titleFilter, selectedTags], () => fetchBlueprintSummaries(page, titleFilter, selectedTags), options);

	// TODO: Refactor out grid commonality

	const {isLoading, isError, data, isPreviousData} = result;

	if (isError)
	{
		console.log({result});
		return (
			<>
				{'Error loading blueprint summaries.'}
			</>
		);
	}

	const {_data: blueprintSummaries, _metadata: {pagination: {numberOfPages, pageNumber}}} = data;

	return (
		<Container fluid>
			<PageHeader title='Most Favorited' />
			<Row>
				<EfficientSearchForm />
				<EfficientTagForm />
			</Row>
			{isLoading && <Row>
				<LoadingIcon isLoading={isLoading} />
				{' Loading blueprints'}
			</Row>}
			<Row className='justify-content-center'>
				{
					blueprintSummaries.map(blueprintSummary =>
						(
							<BlueprintThumbnail
								key={blueprintSummary.key}
								blueprintSummary={blueprintSummary}
							/>
						))
				}
			</Row>
			<PaginationControls
				page={page}
				setPage={setPage}
				pageNumber={pageNumber}
				numberOfPages={numberOfPages}
				isPreviousData={isPreviousData}
			/>
		</Container>
	);
}

export default MostFavoritedGrid;
