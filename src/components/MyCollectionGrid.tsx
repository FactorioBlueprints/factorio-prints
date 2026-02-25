import {faClipboard, faPlusSquare, faSave} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useQueryClient} from '@tanstack/react-query';
import {useStore} from '@tanstack/react-store';
import {getAuth} from 'firebase/auth';
import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import {useAuthState} from 'react-firebase-hooks/auth';
import {cleanupInvalidUserCollection} from '../api/firebase';
import {app} from '../base';
import useEnrichedBlueprintSummaries from '../hooks/useEnrichedBlueprintSummaries';
import useFilteredBlueprintSummaries from '../hooks/useFilteredBlueprintSummaries';
import {useUserCollection} from '../hooks/useUser';
import {deserializeBlueprintNoThrow, serializeBlueprint} from '../parsing/blueprintParser';
import {blueprintQuery} from '../queries/blueprintQueries';
import type {EnrichedBlueprintSummary, RawBlueprintData} from '../schemas';
import {searchParamsStore} from '../store/searchParamsStore';
import {copyBlueprintStringToClipboard, createSyntheticBlueprintBook} from '../utils/collectionBlueprintBook';
import BlueprintThumbnail from './BlueprintThumbnail';
import DisplayName from './DisplayName';
import ErrorBoundary from './ErrorBoundary';
import EmptyResults from './grid/EmptyResults';
import ErrorDisplay from './grid/ErrorDisplay';
import LoadingIndicator from './grid/LoadingIndicator';
import PageHeader from './PageHeader';
import SearchForm from './SearchForm';
import TagForm from './TagForm';

type StatusState = {variant: 'success' | 'warning' | 'danger'; message: string} | null;

const sortByLastUpdatedDesc = (a: EnrichedBlueprintSummary, b: EnrichedBlueprintSummary) => {
	const dateA = a.lastUpdatedDate ? new Date(a.lastUpdatedDate) : new Date(0);
	const dateB = b.lastUpdatedDate ? new Date(b.lastUpdatedDate) : new Date(0);
	return dateB.getTime() - dateA.getTime();
};

const MyCollectionGrid: React.FC = () => {
	const [user] = useAuthState(getAuth(app));
	const userId = user?.uid;
	const queryClient = useQueryClient();
	const [isCopying, setIsCopying] = React.useState(false);
	const [status, setStatus] = React.useState<StatusState>(null);

	const filteredTags = useStore(searchParamsStore, (state) => state.filteredTags);

	const {data, isLoading, isSuccess, error} = useUserCollection(userId);
	const {queriesByKey: blueprintQueriesById, blueprintSummaries} = useEnrichedBlueprintSummaries(data, isSuccess);

	React.useEffect(() => {
		if (isSuccess && userId && Object.keys(blueprintQueriesById).length > 0) {
			Object.entries(blueprintQueriesById).forEach(([blueprintId, query]) => {
				if (query.isError && query.error?.message?.includes('not found')) {
					cleanupInvalidUserCollection(userId, blueprintId)
						.then((didCleanup: boolean) => {
							if (!didCleanup) {
								return;
							}

							queryClient.setQueryData(
								['users', 'userId', userId, 'collection'],
								(oldData: Record<string, boolean> | undefined) => {
									if (!oldData) return oldData;

									const newData = {...oldData};
									delete newData[blueprintId];
									return newData;
								},
							);

							queryClient.removeQueries({
								queryKey: ['users', 'userId', userId, 'collection', 'blueprintId', blueprintId],
							});
						})
						.catch(() => {});
				}
			});
		}
	}, [isSuccess, userId, blueprintQueriesById, queryClient]);

	const validBlueprintSummaries = React.useMemo(
		() => blueprintSummaries.filter((bp): bp is EnrichedBlueprintSummary => bp !== null),
		[blueprintSummaries],
	);

	const filteredBlueprints = useFilteredBlueprintSummaries(validBlueprintSummaries);
	const sortedBlueprints = React.useMemo(
		() => [...filteredBlueprints].sort(sortByLastUpdatedDesc),
		[filteredBlueprints],
	);

	const sortedCollectionForExport = React.useMemo(
		() => [...validBlueprintSummaries].sort(sortByLastUpdatedDesc),
		[validBlueprintSummaries],
	);

	const handleCopyCollection = React.useCallback(async () => {
		if (!userId) {
			return;
		}

		setStatus(null);
		setIsCopying(true);

		try {
			if (sortedCollectionForExport.length === 0) {
				throw new Error('Your collection is empty. Add at least one blueprint before exporting.');
			}

			const decodedBlueprints: RawBlueprintData[] = [];
			let skippedCount = 0;

			for (const blueprintSummary of sortedCollectionForExport) {
				const rawBlueprint = await queryClient.fetchQuery(
					blueprintQuery(blueprintSummary.key, blueprintSummary),
				);

				if (!rawBlueprint?.blueprintString) {
					skippedCount += 1;
					continue;
				}

				const decoded = deserializeBlueprintNoThrow(rawBlueprint.blueprintString, {
					blueprintId: blueprintSummary.key,
				});

				if (!decoded) {
					skippedCount += 1;
					continue;
				}

				decodedBlueprints.push(decoded);
			}

			if (decodedBlueprints.length === 0) {
				throw new Error('None of your collection blueprints could be exported.');
			}

			const syntheticBook = createSyntheticBlueprintBook(decodedBlueprints, {
				label: user?.displayName ? `${user.displayName}'s Collection` : 'Blueprint Collection',
				description: 'Exported from https://factorioprints.com',
			});

			const syntheticBookString = serializeBlueprint(syntheticBook);
			await copyBlueprintStringToClipboard(syntheticBookString);

			if (skippedCount > 0) {
				setStatus({
					variant: 'warning',
					message: `Copied a blueprint book with ${decodedBlueprints.length} entries to clipboard. Skipped ${skippedCount} invalid entries.`,
				});
			} else {
				setStatus({
					variant: 'success',
					message: `Copied a blueprint book with ${decodedBlueprints.length} entries to clipboard.`,
				});
			}
		} catch (copyError) {
			setStatus({
				variant: 'danger',
				message:
					copyError instanceof Error
						? copyError.message
						: 'Failed to copy collection blueprint book to clipboard.',
			});
		} finally {
			setIsCopying(false);
		}
	}, [queryClient, sortedCollectionForExport, user, userId]);

	if (!user) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">My Collection</h1>
				<p className="lead">Please log in with Google or GitHub to manage and export your collection.</p>
			</div>
		);
	}

	const isEmpty = isSuccess && sortedBlueprints.length === 0;

	return (
		<Container fluid>
			<PageHeader
				title={
					<>
						<FontAwesomeIcon
							icon={faSave}
							className="text-warning"
						/>{' '}
						by <DisplayName userId={userId} />
					</>
				}
			/>

			<Row className="mb-3 justify-content-center">
				<Button
					type="button"
					variant="warning"
					onClick={handleCopyCollection}
					disabled={isCopying || !isSuccess}
				>
					<FontAwesomeIcon
						icon={faClipboard}
						size="lg"
						fixedWidth
					/>
					{isCopying ? ' Building Blueprint Book...' : ' Copy Collection Blueprint Book'}
				</Button>
			</Row>

			{status && (
				<Row className="justify-content-center">
					<Alert
						variant={status.variant}
						className="w-100"
					>
						{status.message}
					</Alert>
				</Row>
			)}

			<Row>
				<SearchForm />
				<TagForm />
			</Row>

			<LoadingIndicator
				isLoading={isLoading}
				message="Loading collection..."
			/>

			<ErrorDisplay
				error={error}
				message="There was a problem loading your collection. Please try again later."
			/>

			<EmptyResults
				isEmpty={isEmpty}
				filteredTags={filteredTags}
			>
				<p>
					Your collection is empty. Use the <FontAwesomeIcon icon={faPlusSquare} /> icon on blueprints to add
					prints you want in your export book.
				</p>
			</EmptyResults>

			<Row className="blueprint-grid-row justify-content-center">
				{sortedBlueprints.map((blueprintSummary: EnrichedBlueprintSummary) => (
					<ErrorBoundary
						key={blueprintSummary.key}
						fallback={
							<div
								className="blueprint-thumbnail col-auto"
								style={{width: '11rem'}}
							>
								<div className="text-danger p-3">Failed to load blueprint</div>
							</div>
						}
						showDetails={false}
					>
						<BlueprintThumbnail blueprintSummary={blueprintSummary} />
					</ErrorBoundary>
				))}
			</Row>
		</Container>
	);
};

export default MyCollectionGrid;
