import {useStore} from '@tanstack/react-store';
import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import {useParams} from '@tanstack/react-router';
import {Route as UserUserIdRoute} from '../routes/user.$userId';
import useEnrichedBlueprintSummaries from '../hooks/useEnrichedBlueprintSummaries';
import useFilteredBlueprintSummaries from '../hooks/useFilteredBlueprintSummaries';
import {useUserBlueprints} from '../hooks/useUser';
import {searchParamsStore} from '../store/searchParamsStore';
import {EnrichedBlueprintSummary} from '../schemas';

import BlueprintThumbnail from './BlueprintThumbnail';
import DisplayName from './DisplayName';
import EmptyResults from './grid/EmptyResults';
import ErrorDisplay from './grid/ErrorDisplay';
import LoadingIndicator from './grid/LoadingIndicator';
import PageHeader from './PageHeader';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

const UserGrid: React.FC = () => {
	const {userId} = useParams({from: UserUserIdRoute.id});
	const filteredTags = useStore(searchParamsStore, (state) => state.filteredTags);

	const {data: data, isLoading: isLoading, isSuccess: isSuccess, error: error} = useUserBlueprints(userId);

	const {blueprintSummaries} = useEnrichedBlueprintSummaries(data, isSuccess);

	// Filter out null values before passing to the filter hook
	const validBlueprintSummaries = blueprintSummaries.filter(
		(summary): summary is EnrichedBlueprintSummary => summary !== null,
	);

	const filteredBlueprints = useFilteredBlueprintSummaries(validBlueprintSummaries);

	// Sort newest first
	const sortedBlueprints = [...filteredBlueprints].sort(
		(a: EnrichedBlueprintSummary, b: EnrichedBlueprintSummary) => {
			const dateA = a.lastUpdatedDate ? new Date(a.lastUpdatedDate) : new Date(0);
			const dateB = b.lastUpdatedDate ? new Date(b.lastUpdatedDate) : new Date(0);
			return dateB.getTime() - dateA.getTime();
		},
	);

	const isEmpty = isSuccess && sortedBlueprints.length === 0;

	return (
		<Container fluid>
			<PageHeader
				title={
					<>
						Blueprints by <DisplayName userId={userId} />
					</>
				}
			/>
			<Row>
				<SearchForm />
				<TagForm />
			</Row>

			<LoadingIndicator
				isLoading={isLoading}
				message="Loading blueprints..."
			/>

			<ErrorDisplay
				error={error}
				message="There was a problem loading the blueprints. Please try again later."
			/>

			<EmptyResults
				isEmpty={isEmpty}
				filteredTags={filteredTags}
			>
				<p>This user hasn't created any blueprints yet.</p>
			</EmptyResults>

			<Row className="blueprint-grid-row justify-content-center">
				{sortedBlueprints.map((blueprintSummary: EnrichedBlueprintSummary) => (
					<BlueprintThumbnail
						key={blueprintSummary.key}
						blueprintSummary={blueprintSummary}
					/>
				))}
			</Row>
		</Container>
	);
};

export default UserGrid;
