import {faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import axios from 'axios';
import React, {useContext, useState} from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

import {ArrayParam, StringParam, useQueryParam, withDefault} from 'use-query-params';

import UserContext from '../../context/userContext';
import useDisplayName from '../../hooks/useDisplayName';

import BlueprintThumbnail from '../BlueprintThumbnail';
import LoadingIcon from '../LoadingIcon';
import PageHeader from '../PageHeader';
import EfficientSearchForm from '../search/EfficientSearchForm';
import EfficientTagForm from '../search/EfficientTagForm';
import Spinner from '../single/Spinner';
import PaginationControls from './PaginationControls';

function UserGrid() {
	const [page, setPage] = useState(1);

	const [titleFilter] = useQueryParam('title', StringParam);
	const [selectedTags] = useQueryParam('tags', withDefault(ArrayParam, []));

	const {user} = useContext(UserContext);

	const {userId} = useParams();

	const fetchBlueprintSummaries = async (page, titleFilter, selectedTags, userId) => {
		const url = `${process.env.REACT_APP_REST_URL}/api/user/${userId}/blueprintSummaries/page/${page}`;
		const params = new URLSearchParams();
		if (titleFilter) {
			params.append('title', titleFilter);
		}
		selectedTags.forEach((tag) => params.append('tag', '/' + tag + '/'));
		const result = await axios.get(url, {params});
		return result.data;
	};

	const options = {
		placeholderData: (previousData) => previousData,
	};
	const result = useQuery({
		queryKey: ['user', userId, page, titleFilter, selectedTags],
		queryFn: () => fetchBlueprintSummaries(page, titleFilter, selectedTags, userId),
		...options,
	});

	const displayNameResult = useDisplayName(userId);

	// TODO: Refactor out grid commonality

	const {isPending, isError, data, isPlaceholderData} = result;
	const {isPending: isDisplayNameLoading, data: displayNameData} = displayNameResult;

	if (isPending) {
		return <Spinner />;
	}

	if (isError || displayNameData._data === null) {
		console.log({result});
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1>
					<FontAwesomeIcon
						icon={faExclamationTriangle}
						size="lg"
						fixedWidth
					/>
					{'Error loading blueprint summaries.'}
				</h1>
			</div>
		);
	}

	const {
		_data: blueprintSummaries,
		_metadata: {
			pagination: {numberOfPages, pageNumber},
		},
	} = data;

	const getTitle = () => {
		const ownedByCurrentUser = user && user.uid === userId;
		const you = ownedByCurrentUser ? ' (You)' : '';

		if (isDisplayNameLoading) {
			return (
				<span>
					{'Blueprints by '}
					<LoadingIcon isPending={isDisplayNameLoading} />
				</span>
			);
		}

		return <span>{`Blueprints by ${displayNameData._data.displayName || '(Anonymous)'}${you}`}</span>;
	};

	return (
		<Container fluid>
			<PageHeader title={getTitle()} />
			<Row>
				<EfficientSearchForm />
				<EfficientTagForm />
			</Row>
			<Row className="justify-content-center">
				{blueprintSummaries.map((blueprintSummary) => (
					<BlueprintThumbnail
						key={blueprintSummary.key}
						blueprintSummary={blueprintSummary}
					/>
				))}
			</Row>
			<PaginationControls
				page={page}
				setPage={setPage}
				pageNumber={pageNumber}
				numberOfPages={numberOfPages}
				isPlaceholderData={isPlaceholderData}
			/>
		</Container>
	);
}

export default UserGrid;
