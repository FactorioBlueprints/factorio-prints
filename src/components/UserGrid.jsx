import {useStore}                    from '@tanstack/react-store';
import React                         from 'react';
import Container                     from 'react-bootstrap/Container';
import Row                           from 'react-bootstrap/Row';
import {useParams}                   from '@tanstack/react-router';
import useEnrichedBlueprintSummaries from '../hooks/useEnrichedBlueprintSummaries';
import useFilteredBlueprintSummaries from '../hooks/useFilteredBlueprintSummaries';
import {useUserBlueprints}           from '../hooks/useUser';
import {searchParamsStore}           from '../store/searchParamsStore';

import BlueprintThumbnail from './BlueprintThumbnail';
import DisplayName        from './DisplayName';
import EmptyResults       from './grid/EmptyResults';
import ErrorDisplay       from './grid/ErrorDisplay';
import LoadingIndicator   from './grid/LoadingIndicator';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

function UserGrid()
{
	const {userId}       = useParams({ from: '/user/$userId' });
	const filteredTags  = useStore(searchParamsStore, state => state.filteredTags);

	const {
		data: data,
		isLoading: isLoading,
		isSuccess: isSuccess,
		error: error,
	} = useUserBlueprints(userId);

	const { blueprintSummaries } = useEnrichedBlueprintSummaries(data, isSuccess);

	const filteredBlueprints = useFilteredBlueprintSummaries(blueprintSummaries);

	// Sort newest first
	const sortedBlueprints = [...filteredBlueprints].sort((a, b) =>
	{
		const dateA = a.lastUpdatedDate ? new Date(a.lastUpdatedDate) : new Date(0);
		const dateB = b.lastUpdatedDate ? new Date(b.lastUpdatedDate) : new Date(0);
		return dateB - dateA;
	});

	const isEmpty = isSuccess && sortedBlueprints.length === 0;

	return (
		<Container fluid>
			<PageHeader title={
				<>
					Blueprints by <DisplayName userId={userId} />
				</>
			} />
			<Row>
				<SearchForm />
				<TagForm />
			</Row>

			<LoadingIndicator
				isLoading={isLoading}
				message='Loading blueprints...'
			/>

			<ErrorDisplay
				error={error}
				message='There was a problem loading the blueprints. Please try again later.'
			/>

			<EmptyResults
				isEmpty={isEmpty}
				filteredTags={filteredTags}
			>
				<p>This user hasn't created any blueprints yet.</p>
			</EmptyResults>

			<Row className='blueprint-grid-row justify-content-center'>
				{sortedBlueprints.map(blueprintSummary =>
					<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />,
				)}
			</Row>
		</Container>
	);
}

export default UserGrid;
