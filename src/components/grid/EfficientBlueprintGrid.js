import {faAngleDoubleLeft, faAngleLeft, faAngleRight, faCog} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import axios             from 'axios';

import React, {useContext, useState} from 'react';

import Button from 'react-bootstrap/Button';
import Col    from 'react-bootstrap/Col';
import Row    from 'react-bootstrap/Row';

import {useQuery, useQueryClient} from 'react-query';

import UserContext        from '../../context/userContext';
import BlueprintThumbnail from '../BlueprintThumbnail';

EfficientBlueprintGrid.propTypes = {};

function getHeaders(idToken)
{
	return {
		headers: {
			Authorization: `Bearer ${idToken}`,
		},
	};
}

function EfficientBlueprintGrid(props)
{
	const [page, setPage] = useState(1);

	const fetchBlueprintSummaries = (page = 1) => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/filtered/page/${page}`);

	const queryClient = useQueryClient();

	const result = useQuery(['blueprintSummaries', page], () => fetchBlueprintSummaries(page), {keepPreviousData: true});

	const {isLoading, isError, error, data, isFetching, isPreviousData} = result;

	const {idToken}    = useContext(UserContext);
	const queryKey     = [idToken, 'myFavorites'];
	const queryEnabled = idToken !== undefined;

	const {myFavoritesIsSuccess, myFavoritesIsLoading, myFavoritesIsError, myFavoritesData} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/my/favorites/`, getHeaders(idToken)),
		{
			enabled: queryEnabled,
		},
	);

	/*
	function useScrollToTop()
	{
		useEffect(() =>
		{
			window.scrollTo(0, 0);
		}, []);
	}
	*/

	if (isLoading)
	{
		return (<>
			<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
			{' Loading...'}
		</>);
	}

	if (isError)
	{
		console.log({result});
		return (
			<>
				{'Error loading blueprint summaries.'}
			</>
		);
	}

	console.log({data: data.data});
	const {_data: blueprintSummaries, _metadata: {pagination: {numberOfPages, pageNumber}}} = data.data;

	return (
		<>
			<Row className='blueprint-grid-row justify-content-center'>
				{
					blueprintSummaries.map(blueprintSummary =>
						(<BlueprintThumbnail
							key={blueprintSummary.key}
							blueprintSummary={blueprintSummary}
						/>))
				}
			</Row>
			<Row>
				{page !== pageNumber && <FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />}
				<Col md={{span: 6, offset: 3}}>
					<Button type='button' onClick={() => setPage(1)} disabled={page === 1}>
						<FontAwesomeIcon icon={faAngleDoubleLeft} size='lg' fixedWidth />
						{'First Page'}
					</Button>
					<Button type='button' onClick={() => setPage(old => Math.max(old - 1, 1))} disabled={page === 1}>
						<FontAwesomeIcon icon={faAngleLeft} size='lg' fixedWidth />
						{'Previous Page'}
					</Button>
					<Button variant='link' type='button' disabled>
						{`Page: ${page}`}
					</Button>
					<Button
						type='button' onClick={() =>
						{
							if (!isPreviousData && numberOfPages > page)
							{
								setPage(old => old + 1);
							}
						}} disabled={isPreviousData || numberOfPages <= page}
					>
						{'Next Page'}
						<FontAwesomeIcon icon={faAngleRight} size='lg' fixedWidth />
					</Button>
				</Col>
			</Row>
		</>
	);
}

export default EfficientBlueprintGrid;
