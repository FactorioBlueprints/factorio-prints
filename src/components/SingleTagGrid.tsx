import {faCog, faTags} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useParams} from '@tanstack/react-router';
import type React from 'react';
import {useEffect} from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

import {useEnrichedTagBlueprintSummaries} from '../hooks/useEnrichedTagBlueprintSummaries';
import {useFilterByTitle} from '../hooks/useFilterByTitle';
import type {EnrichedBlueprintSummary} from '../schemas';
import {searchParamsStore} from '../store/searchParamsStore';

import BlueprintThumbnail from './BlueprintThumbnail';
import PageHeader from './PageHeader';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

const SingleTagGrid: React.FC = () => {
	const params = useParams({strict: false});
	// Handle /tagged/$category/$name route
	const tagId = (params.category && params.name ? `${params.category}/${params.name}` : '') || '';

	// Update searchParamsStore when tag changes
	useEffect(() => {
		if (tagId) {
			const tagWithSlashes = `/${tagId}/`;
			searchParamsStore.setState((state) => ({
				...state,
				filteredTags: [tagWithSlashes],
				titleFilter: '',
			}));
		}
	}, [tagId]);

	const {blueprintQueries, isLoading} = useEnrichedTagBlueprintSummaries(tagId);

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
			<Row className="search-row">
				<SearchForm />
				<TagForm />
			</Row>
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
