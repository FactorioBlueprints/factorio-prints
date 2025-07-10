import {faCog, faSync, faUser} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useStore} from '@tanstack/react-store';
import {getAuth} from 'firebase/auth';
import React, {useCallback} from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import {useAuthState} from 'react-firebase-hooks/auth';
import {Link, useParams} from '@tanstack/react-router';

import {app} from '../base';
import useEnrichedBlueprintSummaries from '../hooks/useEnrichedBlueprintSummaries';
import useFilteredBlueprintSummaries from '../hooks/useFilteredBlueprintSummaries';
import {useIsModerator} from '../hooks/useModerators';
import useReconcileUserFavorites from '../hooks/useReconcileUserFavorites';
import {useUserBlueprints, useUserDisplayName, useUserFavorites} from '../hooks/useUser';
import {searchParamsStore} from '../store/searchParamsStore';
import type {EnrichedBlueprintSummary} from '../schemas';

import BlueprintThumbnail from './BlueprintThumbnail';
import NoMatch from './NoMatch';
import PageHeader from './PageHeader';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

const AdminUserView: React.FC = () => {
	const {userId} = useParams({from: '/admin/user/$userId'});
	const [currentUser] = useAuthState(getAuth(app));
	const moderatorQuery = useIsModerator(currentUser?.uid);
	const isModerator = moderatorQuery.data ?? false;
	const filteredTags = useStore(searchParamsStore, (state) => state.filteredTags);

	const reconcileFavoritesMutation = useReconcileUserFavorites();

	const handleReconcileFavorites = useCallback(() => {
		reconcileFavoritesMutation.mutate(userId);
	}, [reconcileFavoritesMutation, userId]);

	const {data: displayName, isLoading: displayNameLoading} = useUserDisplayName(userId);

	const {
		data: userBlueprintsData,
		isLoading: userBlueprintsLoading,
		isSuccess: userBlueprintsSuccess,
		error: userBlueprintsError,
	} = useUserBlueprints(userId);

	const {
		data: userFavoritesData,
		isLoading: userFavoritesLoading,
		isSuccess: userFavoritesSuccess,
	} = useUserFavorites(userId);

	const {blueprintSummaries} = useEnrichedBlueprintSummaries(userBlueprintsData || {}, userBlueprintsSuccess);

	const {blueprintSummaries: favoriteSummaries} = useEnrichedBlueprintSummaries(
		userFavoritesData
			? Object.entries(userFavoritesData)
					.filter(([, value]) => value === true)
					.reduce((acc, [key]) => ({...acc, [key]: true}), {})
			: {},
		userFavoritesSuccess,
	);

	const filteredBlueprints = useFilteredBlueprintSummaries(
		blueprintSummaries.filter((b): b is EnrichedBlueprintSummary => b !== null),
	);
	const filteredFavorites = useFilteredBlueprintSummaries(
		favoriteSummaries.filter((b): b is EnrichedBlueprintSummary => b !== null),
	);

	// Sort newest first
	const sortedBlueprints = [...filteredBlueprints].sort((a, b) => {
		const dateA = a.lastUpdatedDate ? new Date(a.lastUpdatedDate) : new Date(0);
		const dateB = b.lastUpdatedDate ? new Date(b.lastUpdatedDate) : new Date(0);
		return dateB.getTime() - dateA.getTime();
	});

	const sortedFavorites = [...filteredFavorites].sort((a, b) => {
		const dateA = a.lastUpdatedDate ? new Date(a.lastUpdatedDate) : new Date(0);
		const dateB = b.lastUpdatedDate ? new Date(b.lastUpdatedDate) : new Date(0);
		return dateB.getTime() - dateA.getTime();
	});

	const isLoading = displayNameLoading || userBlueprintsLoading || userFavoritesLoading;
	const exists = !userBlueprintsError;

	const renderReconcileButton = useCallback(() => {
		const {data: reconcileResult, isPending, isSuccess} = reconcileFavoritesMutation;
		const buttonText = isPending
			? ' Reconciling...'
			: isSuccess && reconcileResult?.reconciled && 'totalFixed' in reconcileResult
				? ` Fixed (${reconcileResult.totalFixed} issues)`
				: isSuccess && !reconcileResult?.reconciled
					? ' No issues found'
					: ' Reconcile Favorites';

		const buttonVariant = isSuccess ? (reconcileResult?.reconciled ? 'success' : 'info') : 'secondary';

		return (
			<Button
				size="lg"
				variant={buttonVariant}
				onClick={handleReconcileFavorites}
				disabled={isPending}
				className="mb-3"
			>
				<FontAwesomeIcon
					icon={faSync}
					spin={isPending}
				/>
				{buttonText}
			</Button>
		);
	}, [handleReconcileFavorites, reconcileFavoritesMutation]);

	if (currentUser && !isModerator) {
		// TODO 2025-04-19: Instead, show information explaining that this user is not an administrator.
		return null;
	}

	// If not logged in, show message
	if (!currentUser) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">Admin Access Required</h1>
				<p className="lead">Please log in with an administrator account to access this page.</p>
			</div>
		);
	}

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

	if (!exists) {
		return <NoMatch />;
	}

	return (
		<Container fluid>
			<PageHeader
				title={
					<>
						<FontAwesomeIcon
							icon={faUser}
							className="me-2"
						/>
						Admin: User Details - {displayName || '(Anonymous)'}
					</>
				}
			/>

			<div className="mb-3">
				<Link to="/admin">
					<Button
						variant="outline-secondary"
						className="me-2"
					>
						← Back to Admin
					</Button>
				</Link>
				{renderReconcileButton()}
			</div>

			<Row>
				<SearchForm />
				<TagForm />
			</Row>

			<Tabs
				defaultActiveKey="blueprints"
				className="mb-3"
			>
				<Tab
					eventKey="blueprints"
					title={`Blueprints (${sortedBlueprints.length})`}
				>
					<Row className="blueprint-grid-row justify-content-center">
						{sortedBlueprints.length > 0 ? (
							sortedBlueprints.map((blueprintSummary: EnrichedBlueprintSummary) => (
								<BlueprintThumbnail
									key={blueprintSummary.key || blueprintSummary.key}
									blueprintSummary={blueprintSummary}
								/>
							))
						) : (
							<div className="col-12 text-center">
								<h3>No blueprints found</h3>
								{filteredTags.length > 0 ? (
									<p>Try removing some tag filters to see more results.</p>
								) : (
									<p>This user hasn't created any blueprints yet.</p>
								)}
							</div>
						)}
					</Row>
				</Tab>

				<Tab
					eventKey="favorites"
					title={`Favorites (${sortedFavorites.length})`}
				>
					<Row className="blueprint-grid-row justify-content-center">
						{sortedFavorites.length > 0 ? (
							sortedFavorites.map((blueprintSummary: EnrichedBlueprintSummary) => (
								<BlueprintThumbnail
									key={blueprintSummary.key || blueprintSummary.key}
									blueprintSummary={blueprintSummary}
								/>
							))
						) : (
							<div className="col-12 text-center">
								<h3>No favorites found</h3>
								{filteredTags.length > 0 ? (
									<p>Try removing some tag filters to see more results.</p>
								) : (
									<p>This user hasn't favorited any blueprints yet.</p>
								)}
							</div>
						)}
					</Row>
				</Tab>
			</Tabs>
		</Container>
	);
};

export default AdminUserView;
