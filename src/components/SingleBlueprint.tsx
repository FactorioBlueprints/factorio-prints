import {useParams} from '@tanstack/react-router';
import Disqus from 'disqus-react';
import {getAuth, User} from 'firebase/auth';
import flatMap from 'lodash/flatMap';
import forOwn from 'lodash/forOwn';
import countBy from 'lodash/fp/countBy';
import flow from 'lodash/fp/flow';
import reverse from 'lodash/fp/reverse';
import sortBy from 'lodash/fp/sortBy';
import toPairs from 'lodash/fp/toPairs';
import has from 'lodash/has';
import React, {useCallback, useEffect, useState} from 'react';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import {useAuthState} from 'react-firebase-hooks/auth';
import {app} from '../base';
import {useIsFavorite} from '../hooks/useBlueprintFavorite';
import {useEnrichedBlueprint} from '../hooks/useEnrichedBlueprint';
import {useEnrichedBlueprintSummary} from '../hooks/useEnrichedBlueprintSummary';
import {useIsModerator} from '../hooks/useModerators';
import useToggleFavoriteMutation from '../hooks/useToggleFavoriteMutation';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import type {BlueprintContent, BlueprintEntity, BlueprintTile} from '../schemas';
import BlueprintImage from './BlueprintImage';
import BlueprintTitle from './BlueprintTitle';
import BlueprintMarkdownDescription from './BlueprintMarkdownDescription';
import Table from 'react-bootstrap/Table';
import TagBadge from './TagBadge';
import DisqusErrorBoundary from './DisqusErrorBoundary';
import {FactorioIcon, type SignalType, type Quality} from './core/icons/FactorioIcon';
import {BasicInfoPanel} from './blueprint/panels/info/BasicInfoPanel';
import {ExtraInfoPanel} from './blueprint/panels/info/ExtraInfoPanel';
import {ParametersPanel} from './blueprint/panels/parameters/ParametersPanel';
import {RichText} from './core/text/RichText';
import {ActionButtons} from './single/ActionButtons';
import {BlueprintActions} from './single/BlueprintActions';
import {BlueprintNotFound} from './single/BlueprintNotFound';
import {CommentsSection} from './single/CommentsSection';
import {DetailsCard} from './single/DetailsCard';
import {PostInfoCard} from './single/PostInfoCard';
import {PostInfoTable} from './single/PostInfoTable';
import {RequirementsCard} from './single/RequirementsCard';
import {RequirementsTable} from './single/RequirementsTable';
import {TagsCard} from './single/TagsCard';
import {UpgradePlannerCard} from './single/UpgradePlannerCard';
import {UpgradePlannerTable} from './single/UpgradePlannerTable';

interface ReconcileResult {
	blueprintId: string;
	actualCount: number;
	previousBlueprintCount: number;
	previousSummaryCount: number;
	hasDiscrepancy: boolean;
	reconciled: boolean;
}

interface EntityHistogramItem {
	name: string;
	count: number;
}

interface ItemData {
	item?: string;
	count?: number;
	id?: {
		name: string;
	};
	items?: {
		in_inventory?: any[];
	};
}

declare global {
	interface Window {
		DISQUS?: {
			reset: (config: {reload: boolean}) => void;
		};
	}
}

function SingleBlueprint() {
	const {blueprintId} = useParams({from: '/view/$blueprintId'});

	const [user] = useAuthState(getAuth(app));
	const [showBlueprint, setShowBlueprint] = useState(false);
	const [showJson, setShowJson] = useState(false);
	const [copiedText, setCopiedText] = useState('');

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

	const initialLoadRef = React.useRef(true);

	// Scroll to top on initial data load
	useEffect(() => {
		if (blueprintIsSuccess && initialLoadRef.current) {
			window.scrollTo(0, 0);
			initialLoadRef.current = false;
		}
	}, [blueprintIsSuccess]);

	const favoriteBlueprintMutation = useToggleFavoriteMutation();

	const handleFavorite = useCallback(() => {
		if (!user) return;
		if (!favoriteIsSuccess) return;
		if (!blueprintData) return;

		const {uid} = user;

		favoriteBlueprintMutation.mutate({
			blueprintId,
			userId: uid,
			isFavorite,
			numberOfFavorites: blueprintData.numberOfFavorites || 0,
		});
	}, [user, isFavorite, favoriteIsSuccess, blueprintId, blueprintData, favoriteBlueprintMutation]);

	const copyToClipboard = useCallback((text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			setCopiedText(text);
			setTimeout(() => setCopiedText(''), 2000);
		});
	}, []);

	const handleShowHideBase64 = useCallback(() => {
		setShowBlueprint((prev) => !prev);
	}, []);

	const handleShowHideJson = useCallback(() => {
		setShowJson((prev) => !prev);
	}, []);

	const safeJsonStringify = (obj: any, space?: number) => {
		try {
			return JSON.stringify(obj, null, space);
		} catch {
			return 'Error: Unable to convert to JSON';
		}
	};

	const entityHistogram = useCallback((parsedBlueprint: BlueprintContent): [string, number][] => {
		const entities = parsedBlueprint.entities || [];
		const tiles = parsedBlueprint.tiles || [];
		const validEntities = [...entities, ...tiles].filter(
			(entity) => typeof entity.name === 'string' || typeof entity.name === 'number',
		);

		return flow(
			countBy<BlueprintEntity | BlueprintTile>('name'),
			toPairs,
			sortBy(1),
			reverse,
		)(validEntities) as unknown as [string, number][];
	}, []);

	const itemHistogram = useCallback((parsedBlueprint: BlueprintContent): [string, number][] => {
		const result: Record<string, number> = {};
		const items = flatMap(parsedBlueprint.entities, (entity) => (entity.items || []) as ItemData[]);

		items.forEach((item) => {
			// Handle original format: {item: "copper-cable", count: 5}
			if (has(item, 'item') && has(item, 'count')) {
				result[item.item!] = (result[item.item!] || 0) + item.count!;
			}
			// Handle new format with id.name and items structure
			else if (has(item, 'id') && has(item.id, 'name')) {
				const itemName = item.id!.name;
				// Count the number of stacks if items.in_inventory exists
				if (has(item, 'items') && item.items && has(item.items, 'in_inventory')) {
					const inventory = item.items.in_inventory as any;
					if (Array.isArray(inventory)) {
						const stackCount = inventory.length;
						result[itemName] = (result[itemName] || 0) + stackCount;
					} else if (inventory) {
						result[itemName] = (result[itemName] || 0) + 1;
					}
				}
				// Just count it once if we can't determine the stack count
				else {
					result[itemName] = (result[itemName] || 0) + 1;
				}
			}
			// Handle old style direct key-value pairs: {"copper-cable": 5}
			else if (typeof item === 'object') {
				forOwn(item, (value, key) => {
					// Skip non-primitive values that might cause [object Object] rendering
					if (typeof value !== 'object' || value === null) {
						result[key] = (result[key] || 0) + (value as number);
					}
				});
			}
		});

		return flow(toPairs, sortBy(1), reverse)(result) as unknown as [string, number][];
	}, []);

	const memoizedEntityHistogram = React.useMemo(() => {
		return blueprintData?.parsedData?.blueprint ? entityHistogram(blueprintData.parsedData.blueprint) : [];
	}, [blueprintData?.parsedData, entityHistogram]);

	const memoizedItemHistogram = React.useMemo(() => {
		return blueprintData?.parsedData?.blueprint ? itemHistogram(blueprintData.parsedData.blueprint) : [];
	}, [blueprintData?.parsedData, itemHistogram]);

	// Clean up Disqus on unmount to prevent DOM manipulation errors
	useEffect(() => {
		return () => {
			if (window.DISQUS) {
				try {
					window.DISQUS.reset({
						reload: false,
					});
				} catch {
					// Silently ignore Disqus cleanup errors
				}
			}
		};
	}, []);

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
		<>
			<title>
				{blueprintIsLoading ? 'Factorio Prints: Loading...' : `Factorio Prints: ${blueprintData?.title}`}
			</title>
			<Container>
				<Row>
					<Col md={9}>
						<div className="d-flex mt-4">
							<BlueprintTitle
								title={blueprintData?.title}
								isLoading={blueprintIsLoading}
							/>
						</div>
					</Col>
					<Col
						md={3}
						className="d-flex align-items-center justify-content-end"
					>
						<ActionButtons
							user={user}
							blueprintId={blueprintId}
							isOwner={isOwner || false}
							isModerator={isModerator}
							isFavorite={isFavorite}
							onFavorite={handleFavorite}
							favoriteMutationIsPending={favoriteBlueprintMutation.isPending}
						/>
					</Col>
				</Row>
				<Row>
					<Col md={4}>
						<BlueprintImage
							image={blueprintData?.image}
							thumbnail={blueprintData?.thumbnail}
							isLoading={blueprintIsLoading}
						/>
						{tagsData && tagsData.length > 0 && (
							<Card>
								<Card.Header>Tags</Card.Header>
								<Card.Body>
									<h4>
										{flatMap(tagsData, (tag) => (
											<TagBadge
												key={tag}
												tag={tag}
											/>
										))}
									</h4>
								</Card.Body>
							</Card>
						)}
						<PostInfoTable
							authorUserId={blueprintData?.author?.userId}
							createdDate={blueprintData?.createdDate}
							lastUpdatedDate={blueprintData?.lastUpdatedDate}
							numberOfFavorites={blueprintData?.numberOfFavorites}
							isLoading={blueprintIsLoading}
						/>
						{blueprintWrapper && blueprintWrapper.getType() === 'blueprint' && (
							<RequirementsTable
								entityHistogram={memoizedEntityHistogram}
								itemHistogram={memoizedItemHistogram}
							/>
						)}
					</Col>
					<Col md={8}>
						<Card>
							<Card.Header>Details</Card.Header>
							<Card.Body>
								<BlueprintMarkdownDescription
									markdown={blueprintData?.descriptionMarkdown}
									isLoading={blueprintIsLoading}
								/>
							</Card.Body>
							<BlueprintActions
								blueprintString={blueprintData?.blueprintString}
								showBlueprint={showBlueprint}
								showJson={showJson}
								copiedText={copiedText}
								onCopyToClipboard={copyToClipboard}
								onToggleShowBlueprint={handleShowHideBase64}
								onToggleShowJson={handleShowHideJson}
							/>
						</Card>
						{/* Add BasicInfoPanel for blueprint information */}
						<BasicInfoPanel blueprint={blueprintData?.parsedData} />
						<ExtraInfoPanel blueprint={blueprintData?.parsedData} />
						<ParametersPanel blueprintString={blueprintData?.parsedData} />
						{showBlueprint && (
							<Card>
								<Card.Header>Blueprint String</Card.Header>
								<Card.Body>
									<div className="blueprintString">{blueprintData?.blueprintString}</div>
								</Card.Body>
							</Card>
						)}
						{showJson && (
							<Card>
								<Card.Header>Json Representation</Card.Header>
								<Card.Body className="code">
									{safeJsonStringify(blueprintData?.parsedData, 4)}
								</Card.Body>
							</Card>
						)}
						{blueprintWrapper &&
							blueprintWrapper.getType() === 'upgrade-planner' &&
							blueprintData?.parsedData && (
								<UpgradePlannerTable parsedData={blueprintData.parsedData} />
							)}{' '}
					</Col>
				</Row>
				{blueprintData && (
					<CommentsSection
						blueprintId={blueprintId}
						blueprintTitle={blueprintData?.title}
					/>
				)}
			</Container>
		</>
	);
}

export default React.memo(SingleBlueprint);
