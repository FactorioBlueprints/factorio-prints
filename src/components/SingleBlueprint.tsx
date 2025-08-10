import {useNavigate, useParams} from '@tanstack/react-router';
import {getAuth, User} from 'firebase/auth';
import React, {useCallback, useEffect, useOptimistic} from 'react';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import {useAuthState} from 'react-firebase-hooks/auth';
import {app} from '../base';
import {useIsFavorite} from '../hooks/useBlueprintFavorite';
import {useBlueprintHistograms} from '../hooks/useBlueprintHistograms';
import {useEnrichedBlueprint} from '../hooks/useEnrichedBlueprint';
import {useEnrichedBlueprintSummary} from '../hooks/useEnrichedBlueprintSummary';
import {useIsModerator} from '../hooks/useModerators';
import useReconcileFavoritesMutation from '../hooks/useReconcileFavorites';
import useToggleFavoriteMutation from '../hooks/useToggleFavoriteMutation';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import {Route as ViewBlueprintIdRoute} from '../routes/view.$blueprintId';
import BlueprintImage from './BlueprintImage';
import BlueprintTitle from './BlueprintTitle';
import {BasicInfoPanel} from './blueprint/panels/info/BasicInfoPanel';
import {ParametersPanel} from './blueprint/panels/parameters/ParametersPanel';
import {BlueprintActions} from './single/BlueprintActions';
import {BlueprintNotFound} from './single/BlueprintNotFound';
import BlueprintTitles from './single/BlueprintTitles';
import {CommentsSection} from './single/CommentsSection';
import {DetailsCard} from './single/DetailsCard';
import {PostInfoCard} from './single/PostInfoCard';
import {RequirementsCard} from './single/RequirementsCard';
import {TagsCard} from './single/TagsCard';
import {UpgradePlannerCard} from './single/UpgradePlannerCard';

function SingleBlueprint() {
	const {blueprintId} = useParams({from: '/view/$blueprintId'});
	const navigate = useNavigate();

	const [user] = useAuthState(getAuth(app));

	// First fetch the blueprint summary
	const {
		data: blueprintSummary,
		error: summaryError,
		isSuccess: summaryIsSuccess,
	} = useEnrichedBlueprintSummary(blueprintId);

	// Then fetch the full blueprint, passing the summary
	const {
		data: blueprintData,
		isSuccess: blueprintIsSuccess,
		isLoading: blueprintIsLoading,
		error: blueprintError,
	} = useEnrichedBlueprint(blueprintId, blueprintSummary);

	const tagsData = Object.keys(blueprintData?.tags || {});

	const blueprintWrapper = React.useMemo(
		() => (blueprintData?.parsedData ? new BlueprintWrapper(blueprintData?.parsedData) : null),
		[blueprintData?.parsedData],
	);

	const {data: isModerator = false} = useIsModerator(user?.uid);

	const {data: isFavorite, isSuccess: favoriteIsSuccess} = useIsFavorite(user?.uid, blueprintId);

	const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(
		{isFavorite: isFavorite || false, count: blueprintData?.numberOfFavorites || 0},
		(state, action: {type: 'toggle'; numberOfFavorites: number}) => ({
			isFavorite: !state.isFavorite,
			count: action.numberOfFavorites + (state.isFavorite ? -1 : 1),
		}),
	);

	const initialLoadRef = React.useRef(true);

	// Scroll to top on initial data load
	useEffect(() => {
		if (blueprintIsSuccess && initialLoadRef.current) {
			window.scrollTo(0, 0);
			initialLoadRef.current = false;
		}
	}, [blueprintIsSuccess]);

	const favoriteBlueprintMutation = useToggleFavoriteMutation();
	const reconcileFavoritesMutation = useReconcileFavoritesMutation();

	const handleFavorite = useCallback(async () => {
		if (!user) return;
		if (!favoriteIsSuccess) return;
		if (!blueprintData) return;

		const {uid} = user;
		const numberOfFavorites = blueprintData.numberOfFavorites || 0;

		setOptimisticFavorite({type: 'toggle', numberOfFavorites});

		favoriteBlueprintMutation.mutate({
			blueprintId,
			userId: uid,
			isFavorite,
			numberOfFavorites,
		});
	}, [
		user,
		isFavorite,
		favoriteIsSuccess,
		blueprintId,
		blueprintData,
		favoriteBlueprintMutation,
		setOptimisticFavorite,
	]);

	const handleTransitionToEdit = useCallback(() => {
		navigate({to: '/edit/$blueprintId', params: {blueprintId}});
	}, [navigate, blueprintId]);

	const handleReconcileFavorites = useCallback(() => {
		reconcileFavoritesMutation.mutate(blueprintId);
	}, [blueprintId, reconcileFavoritesMutation]);

	// Use the custom hook for histograms
	const {entityHistogram, itemHistogram} = useBlueprintHistograms(blueprintData?.parsedData);

	const error = summaryError || blueprintError;
	const isDeleted = summaryIsSuccess && !blueprintSummary;

	if (error || isDeleted) {
		return (
			<BlueprintNotFound
				error={error}
				isDeleted={isDeleted}
			/>
		);
	}

	const isOwner = user && user.uid === blueprintData?.author?.userId;

	return (
		<Container>
			<title>
				{blueprintIsLoading ? 'Factorio Prints: Loading...' : `Factorio Prints: ${blueprintData?.title}`}
			</title>
			<Row>
				<Col md={9}>
					<div className="d-flex mt-4">
						<BlueprintTitle
							title={blueprintData?.title}
							isLoading={blueprintIsLoading}
						/>
					</div>
				</Col>
				<BlueprintActions
					isOwner={isOwner || false}
					isModerator={isModerator}
					user={user}
					isFavorite={optimisticFavorite.isFavorite}
					onEdit={handleTransitionToEdit}
					onFavorite={handleFavorite}
					onReconcile={handleReconcileFavorites}
					favoriteMutation={favoriteBlueprintMutation}
					reconcileMutation={reconcileFavoritesMutation}
				/>
			</Row>
			<Row>
				<Col md={4}>
					<BlueprintImage
						image={blueprintData?.image}
						thumbnail={blueprintData?.thumbnail}
						isLoading={blueprintIsLoading}
					/>
					<TagsCard tags={tagsData} />
					<PostInfoCard
						authorUserId={blueprintData?.author?.userId}
						createdDate={blueprintData?.createdDate}
						lastUpdatedDate={blueprintData?.lastUpdatedDate}
						numberOfFavorites={optimisticFavorite.count}
						isLoading={blueprintIsLoading}
					/>
					<RequirementsCard
						blueprintWrapper={blueprintWrapper}
						entityHistogram={entityHistogram}
						itemHistogram={itemHistogram}
					/>
				</Col>
				<Col md={8}>
					<DetailsCard
						descriptionMarkdown={blueprintData?.descriptionMarkdown}
						blueprintString={blueprintData?.blueprintString}
						parsedData={blueprintData?.parsedData}
						isLoading={blueprintIsLoading}
					/>
					<BasicInfoPanel blueprint={blueprintData?.parsedData} />
					<Card className="mt-3">
						<Card.Header>Blueprint Titles</Card.Header>
						<Card.Body>
							<BlueprintTitles
								blueprintKey={blueprintId}
								parsedData={blueprintData?.parsedData}
								isLoading={blueprintIsLoading}
							/>
						</Card.Body>
					</Card>
					<ParametersPanel blueprintString={blueprintData?.parsedData} />
					<UpgradePlannerCard
						blueprintWrapper={blueprintWrapper}
						parsedData={blueprintData?.parsedData}
					/>
				</Col>
			</Row>
			{blueprintData && (
				<CommentsSection
					key={`comments-${blueprintId}`}
					blueprintId={blueprintId}
					blueprintTitle={blueprintData?.title}
				/>
			)}
		</Container>
	);
}

export default React.memo(SingleBlueprint);
