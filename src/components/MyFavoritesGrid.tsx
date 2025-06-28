import {faHeart}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {useQueryClient}   from '@tanstack/react-query';
import {useStore}         from '@tanstack/react-store';
import {getAuth}                 from 'firebase/auth';
import React from 'react';
import Container                 from 'react-bootstrap/Container';
import Row                       from 'react-bootstrap/Row';
import {useAuthState}            from 'react-firebase-hooks/auth';

import {app}                         from '../base';
import {cleanupInvalidUserFavorite}  from '../api/firebase';
import useEnrichedBlueprintSummaries from '../hooks/useEnrichedBlueprintSummaries';
import useFilteredBlueprintSummaries from '../hooks/useFilteredBlueprintSummaries';
import {useUserFavorites}            from '../hooks/useUser';
import {EnrichedBlueprintSummary}    from '../schemas';
import {searchParamsStore}           from '../store/searchParamsStore';

import BlueprintThumbnail from './BlueprintThumbnail';
import DisplayName        from './DisplayName.jsx';
import EmptyResults       from './grid/EmptyResults';
import ErrorDisplay       from './grid/ErrorDisplay';
import LoadingIndicator   from './grid/LoadingIndicator';
import PageHeader         from './PageHeader';
import SearchForm         from './SearchForm';
import TagForm            from './TagForm';

const MyFavoritesGrid: React.FC = () =>
{
	const [user]       = useAuthState(getAuth(app));
	const userId = user?.uid;
	const queryClient = useQueryClient();

	const filteredTags = useStore(searchParamsStore, state => state.filteredTags);

	const {
		data             : data,
		isLoading        : isLoading,
		isSuccess        : isSuccess,
		error: error,
	} = useUserFavorites(userId);

	const { queriesByKey: blueprintQueriesById, blueprintSummaries } = useEnrichedBlueprintSummaries(data, isSuccess);

	// Check for failed queries and clean up invalid favorites
	React.useEffect(() =>
	{
		if (isSuccess && userId && Object.keys(blueprintQueriesById).length > 0)
		{
			Object.entries(blueprintQueriesById).forEach(([blueprintId, query]) =>
			{
				// If the query has an error about "not found", clean up the invalid favorite
				if (query.isError && query.error?.message?.includes('not found'))
				{
					cleanupInvalidUserFavorite(userId, blueprintId)
						.then((success: boolean) =>
						{
							if (success)
							{
								// Update all related query caches to remove this favorite

								// 1. Update user favorites list
								queryClient.setQueryData(
									['users', 'userId', userId, 'favorites'],
									(oldData: Record<string, boolean> | undefined) =>
									{
										if (!oldData) return oldData;

										// Create a new object without the deleted blueprint
										const newData = { ...oldData };
										delete newData[blueprintId];
										return newData;
									},
								);

								// 2. Remove the specific user favorite query
								queryClient.removeQueries({
									queryKey: ['users', 'userId', userId, 'favorites', 'blueprintId', blueprintId],
								});

								// 3. Remove the specific blueprint favorite query
								queryClient.removeQueries({
									queryKey: ['blueprints', 'blueprintId', blueprintId, 'favorites', 'userId', userId],
								});

								// 4. Update any blueprint favorites cache if it exists
								queryClient.setQueryData(
									['blueprints', 'blueprintId', blueprintId, 'favorites'],
									(oldData: Record<string, boolean> | undefined) =>
									{
										if (!oldData) return oldData;

										// Create a new object without the user
										const newData = { ...oldData };
										delete newData[userId];
										return newData;
									},
								);

								// 5. Update blueprint favorite count if it exists
								queryClient.setQueryData(
									['blueprints', 'blueprintId', blueprintId],
									(oldData: any) =>
									{
										if (!oldData || !oldData.numberOfFavorites) return oldData;

										return {
											...oldData,
											numberOfFavorites: oldData.numberOfFavorites - 1,
										};
									},
								);

								// 6. Update blueprint summary favorite count if it exists
								queryClient.setQueryData(
									['blueprintSummaries', 'blueprintId', blueprintId],
									(oldData: any) =>
									{
										if (!oldData || !oldData.numberOfFavorites) return oldData;

										return {
											...oldData,
											numberOfFavorites: oldData.numberOfFavorites - 1,
										};
									},
								);
							}
						})
						.catch((error: Error) =>
						{
							console.error(`Failed to clean up invalid favorite ${blueprintId}:`, error);
						});
				}
			});
		}
	}, [isSuccess, userId, blueprintQueriesById, queryClient]);

	const filteredBlueprints = useFilteredBlueprintSummaries(blueprintSummaries.filter((bp): bp is EnrichedBlueprintSummary => bp !== null));

	// Sort newest first
	const sortedBlueprints = [...filteredBlueprints].sort((a: EnrichedBlueprintSummary, b: EnrichedBlueprintSummary) =>
	{
		const dateA = a.lastUpdatedDate ? new Date(a.lastUpdatedDate) : new Date(0);
		const dateB = b.lastUpdatedDate ? new Date(b.lastUpdatedDate) : new Date(0);
		return dateB.getTime() - dateA.getTime();
	});

	if (!user)
	{
		return (
			<div className='p-5 rounded-lg jumbotron'>
				<h1 className='display-4'>
					My Favorites
				</h1>
				<p className='lead'>
					Please log in with Google or GitHub in order to view your favorite blueprints.
				</p>
			</div>
		);
	}

	// Calculate visibility conditions
	const isEmpty = isSuccess && sortedBlueprints.length === 0;

	return (
		<Container fluid>
			<PageHeader title={
				<>
					<FontAwesomeIcon icon={faHeart} className='text-warning' /> by <DisplayName userId={userId} />
				</>
			} />
			<Row>
				<SearchForm />
				<TagForm />
			</Row>

			<LoadingIndicator
				isLoading={isLoading}
				message='Loading favorites...'
			/>

			<ErrorDisplay
				error={error}
				message='There was a problem loading your favorites. Please try again later.'
			/>

			<EmptyResults
				isEmpty={isEmpty}
				filteredTags={filteredTags}
			>
				<p>You haven't favorited any blueprints yet. Browse blueprints and click the heart icon to add them to your favorites.</p>
			</EmptyResults>

			<Row className='blueprint-grid-row justify-content-center'>
				{sortedBlueprints.map((blueprintSummary: EnrichedBlueprintSummary) =>
					<BlueprintThumbnail key={blueprintSummary.key} blueprintSummary={blueprintSummary} />,
				)}
			</Row>

			{/* Pagination removed - show all blueprints */}
		</Container>
	);
};

export default MyFavoritesGrid;
