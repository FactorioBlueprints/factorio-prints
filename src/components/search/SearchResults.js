import {useQuery} from '@tanstack/react-query';
import axios                         from 'axios';
import React, {useState}             from 'react';
import Row                           from 'react-bootstrap/Row';
import BlueprintThumbnail            from '../BlueprintThumbnail';
import BlueprintThumbnailPlaceholder from '../BlueprintThumbnailPlaceholder';
import CustomPagination              from '../pagination/CustomPagination';
import ReactQueryStatus              from './ReactQueryStatus';

const SearchResults = ({searchState}) =>
{
	const [page, setPage] = useState(1);

	const {
			  textState,
			  sortOrderState,
			  tagState,
			  entityState,
			  recipeState,
			  versionState,
			  blueprintTypeState,
			  modState,
		  } = searchState || {};

	const fetchBlueprintSummaries = async () =>
	{
		const url    = `${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/search/page/${page}`;
		const params = new URLSearchParams();
		params.append('pageSize', 12);
		if (textState)
		{
			params.append('text', textState);
		}
		if (sortOrderState)
		{
			params.append('orderBy', sortOrderState);
		}
		if (tagState)
		{
			params.append('tag', `/${tagState}/`);
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
		if (blueprintTypeState)
		{
			params.append('blueprintType', blueprintTypeState);
		}
		if (modState)
		{
			params.append('mod', modState);
		}

		const result = await axios.get(url, {params});
		return result.data;
	};

	const options = {
		placeholderData: (previousData) => previousData,
		enabled         : searchState !== undefined,
	};

	const result = useQuery({
		queryKey: ['blueprintSearch', {
			textState,
			recipeState,
			entityState,
			versionState,
			tagState,
			sortOrderState,
			blueprintTypeState,
			modState,
			page,
		}],
		queryFn: () => fetchBlueprintSummaries(),
		...options,
	});

	const {data, isSuccess, isFetching} = result;

	if (!isSuccess && isFetching)
	{
		return (
			<Row className='justify-content-center'>
				<div className='d-flex justify-content-center'>
					<ReactQueryStatus {...result} />
				</div>
				{
					[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
						.map(index => <BlueprintThumbnailPlaceholder key={index} />)
				}
			</Row>
		);
	}
	if (!isSuccess)
	{
		return <div className='d-flex justify-content-center'>
			<ReactQueryStatus {...result} />
		</div>;
	}

	const {_data: blueprintSummaries, _metadata: {pagination: {numberOfPages, pageNumber: dataPageNumber}}} = data;

	return (
		<Row className='justify-content-center'>
			<div className='d-flex justify-content-center'>
				<ReactQueryStatus {...result} />
			</div>
			{
				blueprintSummaries.map(blueprintSummary =>
					(
						<BlueprintThumbnail
							key={blueprintSummary.key}
							blueprintSummary={blueprintSummary}
						/>
					))
			}
			<CustomPagination
				pageNumber={page}
				dataPageNumber={dataPageNumber}
				numberOfPages={numberOfPages}
				setPage={setPage}
			/>
		</Row>
	);
};

SearchResults.propTypes    = {};
SearchResults.defaultProps = {};

export default SearchResults;
