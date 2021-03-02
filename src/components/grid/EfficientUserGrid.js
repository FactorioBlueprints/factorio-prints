import {faCog}                       from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}             from '@fortawesome/react-fontawesome';
import {forbidExtraProps}            from 'airbnb-prop-types';
import axios                         from 'axios';
import PropTypes                     from 'prop-types';
import React, {useContext, useState} from 'react';
import Container                     from 'react-bootstrap/Container';
import Row                           from 'react-bootstrap/Row';
import {useQuery}                    from 'react-query';

import SearchContext from '../../context/searchContext';
import UserContext   from '../../context/userContext';

import BlueprintThumbnail  from '../BlueprintThumbnail';
import PageHeader          from '../PageHeader';
import EfficientSearchForm from '../search/EfficientSearchForm';
import EfficientTagForm    from '../search/EfficientTagForm';
import PaginationControls  from './PaginationControls';

EfficientUserGrid.propTypes = {
	match: PropTypes.shape({
		params: PropTypes.shape(forbidExtraProps({
			userId: PropTypes.string.isRequired,
		})).isRequired,
	}).isRequired,
};

function EfficientUserGrid(props)
{
	const [page, setPage]             = useState(1);
	const {titleFilter, selectedTags} = useContext(SearchContext);
	const {user}                      = useContext(UserContext);

	const userId = props.match.params.userId;

	const fetchBlueprintSummaries = async (page = 1, titleFilter, selectedTags, userId) =>
	{
		const url    = `${process.env.REACT_APP_REST_URL}/api/user/${userId}/blueprintSummaries/page/${page}`;
		const params = new URLSearchParams();
		params.append('title', titleFilter);
		selectedTags.forEach(tag => params.append('tag', tag.value));
		const result = await axios.get(url, {params});
		return result.data;
	};

	const fetchDisplayName = async (userId) =>
	{
		const url    = `${process.env.REACT_APP_REST_URL}/api/user/${userId}/displayName/`;
		const result = await axios.get(url);
		return result.data;
	}

	const options = {
		keepPreviousData: true,
		placeholderData : {_data: [], _metadata: {pagination: {numberOfPages: 0, pageNumber: 0}}},
	};
	const result  = useQuery(['user', userId, page, titleFilter, selectedTags], () => fetchBlueprintSummaries(page, titleFilter, selectedTags, userId), options);

	const displayNameResult = useQuery(['user', userId, 'displayName'], () => fetchDisplayName(userId));

	// TODO: Refactor out grid commonality

	const {isLoading, isError, data, isPreviousData} = result;
	const {isLoading: isDisplayNameLoading, data: {_data: {displayName}}} = displayNameResult;

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

	const ownedByCurrentUser = user && user.uid === userId;
	const you                = ownedByCurrentUser ? ' (You)' : '';

	return (
		<Container fluid>
			<PageHeader title={`Blueprints by ${displayName || '(Anonymous)'}${you}`} />
			<Row>
				<EfficientSearchForm />
				<EfficientTagForm />
			</Row>
			{isLoading && <Row>
				<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
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

export default EfficientUserGrid;
