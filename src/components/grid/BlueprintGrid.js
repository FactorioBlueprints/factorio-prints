import {faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import axios from 'axios';
import React, {useState} from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import {useQuery} from '@tanstack/react-query';

import {ArrayParam, StringParam, useQueryParam, withDefault} from 'use-query-params';

import useTagOptions from '../../hooks/useTagOptions';

import BlueprintThumbnail from '../BlueprintThumbnail';
import PageHeader from '../PageHeader';
import EfficientSearchForm from '../search/EfficientSearchForm';
import EfficientTagForm from '../search/EfficientTagForm';
import Spinner from '../single/Spinner';
import PaginationControls from './PaginationControls';

function BlueprintGrid() {
	const [page, setPage] = useState(1);

	const {tagValuesSet} = useTagOptions();

	const [titleFilter] = useQueryParam('title', StringParam);
	const [selectedTags] = useQueryParam('tags', withDefault(ArrayParam, []));

	const selectedTagValues = selectedTags.filter((each) => tagValuesSet.has(each));

	const fetchBlueprintSummaries = async (page, titleFilter, selectedTagValues) => {
		const url = `${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/filtered/page/${page}`;
		const params = new URLSearchParams();
		if (titleFilter) {
			params.append('title', titleFilter);
		}
		selectedTagValues.forEach((tag) => params.append('tag', `/${tag}/`));
		const result = await axios.get(url, {params});
		return result.data;
	};

	const options = {
		placeholderData: (previousData) => previousData,
	};

	const result = useQuery({
		queryKey: ['blueprintSummaries', page, titleFilter, selectedTagValues],
		queryFn: () => fetchBlueprintSummaries(page, titleFilter, selectedTagValues),
		...options,
	});

	// TODO: Refactor out grid commonality

	const {isPending, isError, data, isPlaceholderData} = result;

	if (isPending) {
		return <Spinner />;
	}

	if (isError) {
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

	return (
		<Container fluid>
			<PageHeader title="Most Recent" />
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

export default BlueprintGrid;
