import axios                         from 'axios';
import React, {useState}             from 'react';
import Row                           from 'react-bootstrap/Row';
import {useQuery}                    from '@tanstack/react-query';
import BlueprintThumbnail            from '../BlueprintThumbnail';
import BlueprintThumbnailPlaceholder from '../BlueprintThumbnailPlaceholder';
import CustomPagination              from '../pagination/CustomPagination';
import Spinner                       from '../single/Spinner';
import ReactQueryStatus              from './ReactQueryStatus';
import 'holderjs';

const SearchResults = ({searchState}) =>
{
	const [page, setPage]             = useState(1);

	const {
			  textState,
			  sortOrderState,
			  tagState,
			  entityState,
			  recipeState,
			  versionState,
			  blueprintTypeState
		  } = searchState || {};

	const fetchBlueprintSummaries = async () =>
	{
		const url    = `${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/search/page/${page}`;
		const params = new URLSearchParams();
		params.append("pageSize", 12);
		if (textState)
		{
			params.append('text', textState);
		}
		if (recipeState)
		{
			params.append('recipe', recipeState);
		}
		if (entityState)
		{
			params.append('entity', entityState);
		}
		if (versionState)
		{
			params.append('gameVersionLong', versionState);
		}
		if (tagState)
		{
			params.append('tag', `/${tagState}/`);
		}

		const result = await axios.get(url, {params});
		return result.data;
	};

	const options = {
		keepPreviousData: true,
		enabled: searchState !== undefined,
	};

	const result = useQuery(
		['blueprintSearch', textState, recipeState, entityState, versionState, tagState, page],
		() => fetchBlueprintSummaries(),
		options,
	);

	const {isLoading, isError, data, isPreviousData, isSuccess, isFetched, error, isFetching, isIdle} = result;

	if (!isSuccess && isFetching)
	{
		return (
			<Row className='justify-content-center'>
				<p>Loading</p>
				<ReactQueryStatus {...result} />
				{
					[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
						.map(index => <BlueprintThumbnailPlaceholder key={index} />)
				}
			</Row>
		);
	}
	if (isIdle)
	{
		return <>Enter criteria and click search</>
	}
	if (!isSuccess)
	{
		return <ReactQueryStatus {...result} />
	}

	const {_data: blueprintSummaries, _metadata: {pagination: {numberOfPages, pageNumber: dataPageNumber}}} = data;

	return (
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
			<CustomPagination pageNumber={page} dataPageNumber={dataPageNumber} numberOfPages={numberOfPages} setPage={setPage} />
		</Row>
	);
};

SearchResults.propTypes    = {};
SearchResults.defaultProps = {};

export default SearchResults;
