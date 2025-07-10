import {faTags} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import {useParams} from '@tanstack/react-router';

import {useEnrichedTagBlueprintSummaries} from '../hooks/useEnrichedTagBlueprintSummaries';
import {useFilterByTitle} from '../hooks/useFilterByTitle';
import type {EnrichedBlueprintSummary} from '../schemas';

import BlueprintThumbnail from './BlueprintThumbnail';
import EmptyResults from './grid/EmptyResults';
import ErrorDisplay from './grid/ErrorDisplay';
import LoadingIndicator from './grid/LoadingIndicator';
import PageHeader from './PageHeader';
import SearchForm from './SearchForm';
import SingleTagSelector from './SingleTagSelector';

const SingleTagGrid: React.FC = () => {
	const {tag} = useParams({strict: false});
	const tagId = tag || '';

	const {tagQuery, blueprintQueries, isLoading, isError} = useEnrichedTagBlueprintSummaries(tagId);

	const blueprintSummaries: EnrichedBlueprintSummary[] = Object.entries(blueprintQueries)
		.filter(([, query]) => query.isSuccess && query.data)
		.map(([, query]) => query.data!)
		.filter(Boolean);

	const filteredBlueprints = useFilterByTitle(blueprintSummaries);

	const sortedBlueprints = [...filteredBlueprints].sort(
		(a: EnrichedBlueprintSummary, b: EnrichedBlueprintSummary): number => {
			const dateA = a.lastUpdatedDate ? new Date(a.lastUpdatedDate) : new Date(0);
			const dateB = b.lastUpdatedDate ? new Date(b.lastUpdatedDate) : new Date(0);
			return dateB.getTime() - dateA.getTime();
		},
	);

	const formattedTag = tagId.replace(/\//g, ' › ') || '';

	const isSuccess = tagQuery.isSuccess;
	const isEmpty = isSuccess && sortedBlueprints.length === 0;

	return (
		<Container fluid>
			<PageHeader
				title={
					<>
						<FontAwesomeIcon
							icon={faTags}
							className="text-primary"
						/>{' '}
						{formattedTag}
					</>
				}
			/>
			<Row>
				<SearchForm />
				<SingleTagSelector currentTag={tagId} />
			</Row>

			<LoadingIndicator
				isLoading={isLoading}
				message={`Loading blueprints for tag: ${formattedTag}...`}
			/>

			<ErrorDisplay
				error={tagQuery.error || (isError && 'Error loading blueprints')}
				message={`There was a problem loading blueprints for tag: ${formattedTag}. Please try again later.`}
			/>

			<EmptyResults
				isEmpty={isEmpty}
				filteredTags={[]}
			>
				<p>No blueprints found with the tag "{formattedTag}".</p>
				<p>
					<small>
						The URL format for tag browsing is: <code>/tagged/category/name</code>
					</small>
				</p>
			</EmptyResults>

			<Row className="blueprint-grid-row justify-content-center">
				{sortedBlueprints.map((blueprintSummary) => (
					<BlueprintThumbnail
						key={blueprintSummary.key}
						blueprintSummary={blueprintSummary}
					/>
				))}
			</Row>
		</Container>
	);
};

export default SingleTagGrid;
