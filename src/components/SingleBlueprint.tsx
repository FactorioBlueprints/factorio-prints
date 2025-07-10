import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons';
import {
	faCalendar,
	faCheck,
	faClipboard,
	faClock,
	faEdit,
	faHeart,
	faSync,
	faToggleOff,
	faToggleOn,
	faUser,
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Link, useNavigate, useParams} from '@tanstack/react-router';
import {Route as ViewBlueprintIdRoute} from '../routes/view.$blueprintId';
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
import range from 'lodash/range';
import React, {useCallback, useEffect, useState} from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import {useAuthState} from 'react-firebase-hooks/auth';
import {useCopyToClipboard} from 'usehooks-ts';

import {app} from '../base';
import entitiesWithIcons from '../data/entitiesWithIcons';
import {useEnrichedBlueprint} from '../hooks/useEnrichedBlueprint';
import {useEnrichedBlueprintSummary} from '../hooks/useEnrichedBlueprintSummary';
import {useIsFavorite} from '../hooks/useBlueprintFavorite';
import {useIsModerator} from '../hooks/useModerators';
import useReconcileFavoritesMutation from '../hooks/useReconcileFavorites';
import useToggleFavoriteMutation from '../hooks/useToggleFavoriteMutation';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import type {
	BlueprintEntity,
	BlueprintTile,
	BlueprintContent,
	BlueprintIcon,
	BlueprintBookEntry,
	RawBlueprintData,
} from '../schemas';
import {safeJsonStringify} from '../utils/safeJsonStringify';
import BlueprintImage from './BlueprintImage';
import BlueprintMarkdownDescription from './BlueprintMarkdownDescription';
import BlueprintTitle from './BlueprintTitle';
import DateDisplay from './DateDisplay';

import DisplayName from './DisplayName';
import FavoriteCount from './FavoriteCount';
import TagBadge from './TagBadge';
import DisqusErrorBoundary from './DisqusErrorBoundary';
import {FactorioIcon, type SignalType, type Quality} from './core/icons/FactorioIcon';

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

interface DisqusConfig {
	url: string;
	identifier: string;
	title?: string;
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

	const blueprintWrapper = blueprintData?.parsedData ? new BlueprintWrapper(blueprintData?.parsedData) : null;

	const {data: isModerator = false} = useIsModerator(user?.uid);

	const {data: isFavorite, isSuccess: favoriteIsSuccess} = useIsFavorite(user?.uid, blueprintId);

	const [showBlueprint, setShowBlueprint] = useState(false);
	const [showJson, setShowJson] = useState(false);

	const [copiedText, copyToClipboard] = useCopyToClipboard();

	const initialLoadRef = React.useRef(true);

	// Scroll to top on initial data load
	useEffect(() => {
		if (blueprintIsSuccess && initialLoadRef.current) {
			window.scrollTo(0, 0);
			initialLoadRef.current = false;
		}
	}, [blueprintIsSuccess]);

	const hideButton = useCallback(
		(text: string) => (
			<>
				<FontAwesomeIcon
					icon={faToggleOn}
					size="lg"
					fixedWidth
					className="text-success"
				/>
				{` ${text}`}
			</>
		),
		[],
	);

	const showButton = useCallback(
		(text: string) => (
			<>
				<FontAwesomeIcon
					icon={faToggleOff}
					size="lg"
					fixedWidth
				/>
				{` ${text}`}
			</>
		),
		[],
	);

	const favoriteBlueprintMutation = useToggleFavoriteMutation();
	const reconcileFavoritesMutation = useReconcileFavoritesMutation();

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

	const handleShowHideBase64 = useCallback(() => {
		setShowBlueprint((prevState) => !prevState);
	}, []);

	const handleShowHideJson = useCallback(() => {
		setShowJson((prevState) => !prevState);
	}, []);

	const handleTransitionToEdit = useCallback(() => {
		navigate({to: '/edit/$blueprintId', params: {blueprintId}, from: '/view/$blueprintId'});
	}, [navigate, blueprintId]);

	const handleReconcileFavorites = useCallback(() => {
		reconcileFavoritesMutation.mutate(blueprintId);
	}, [blueprintId, reconcileFavoritesMutation]);

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

	const getBookEntry = useCallback((eachBlueprint: BlueprintBookEntry): BlueprintContent | undefined => {
		if (eachBlueprint.blueprint) {
			return eachBlueprint.blueprint;
		}

		if ('upgrade_planner' in eachBlueprint && eachBlueprint.upgrade_planner) {
			return eachBlueprint.upgrade_planner as BlueprintContent;
		}

		if ('deconstruction_planner' in eachBlueprint && eachBlueprint.deconstruction_planner) {
			return eachBlueprint.deconstruction_planner as BlueprintContent;
		}

		if ('blueprint_book' in eachBlueprint && eachBlueprint.blueprint_book) {
			return eachBlueprint.blueprint_book as BlueprintContent;
		}

		return undefined;
	}, []);

	const renderEditButton = useCallback(
		() => (
			<Button
				size="lg"
				onClick={handleTransitionToEdit}
			>
				<FontAwesomeIcon icon={faEdit} />
				{' Edit'}
			</Button>
		),
		[handleTransitionToEdit],
	);

	const renderFavoriteButton = useCallback(() => {
		if (!user) {
			return <div />;
		}

		const heart = isFavorite ? faHeart : regularHeart;
		const iconClass = isFavorite ? 'text-warning' : 'text-default';

		return (
			<Button
				size="lg"
				onClick={handleFavorite}
				disabled={favoriteBlueprintMutation.isPending}
			>
				{/*// TODO 2025-04-22: Change the icon to a spinning cog if isPending*/}
				<FontAwesomeIcon
					icon={heart}
					className={iconClass}
				/>
				{' Favorite'}
			</Button>
		);
	}, [user, isFavorite, handleFavorite, favoriteBlueprintMutation.isPending]);

	const renderReconcileButton = useCallback(() => {
		const {data: reconcileResult, isPending, isSuccess} = reconcileFavoritesMutation;
		const typedResult = reconcileResult as ReconcileResult | undefined;
		const buttonText = isPending
			? ' Reconciling...'
			: isSuccess && typedResult?.hasDiscrepancy
				? ` Fixed (${typedResult.actualCount} favorites)`
				: isSuccess && !typedResult?.hasDiscrepancy
					? ' No issues found'
					: ' Reconcile Favorites';

		const buttonVariant = isSuccess ? (typedResult?.hasDiscrepancy ? 'success' : 'info') : 'secondary';

		const tooltipText = isSuccess
			? typedResult?.hasDiscrepancy
				? `Fixed: ${typedResult.previousBlueprintCount} → ${typedResult.actualCount} favorites`
				: 'No discrepancy detected'
			: 'Reconcile favorites count';

		return (
			<Button
				size="lg"
				variant={buttonVariant}
				onClick={handleReconcileFavorites}
				disabled={isPending}
				title={tooltipText}
			>
				<FontAwesomeIcon
					icon={faSync}
					spin={isPending}
				/>
				{buttonText}
			</Button>
		);
	}, [handleReconcileFavorites, reconcileFavoritesMutation]);

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
			<>
				<title>Factorio Prints: Blueprint Not Found</title>
				<div className="p-5 rounded-lg jumbotron">
					<h1 className="display-4">Blueprint Not Found</h1>
					<p>The blueprint you're looking for could not be found.</p>
					{error && (
						<div className="alert alert-danger">
							<strong>Error:</strong> {error.message || 'An unknown error occurred'}
						</div>
					)}
					{isDeleted && (
						<div className="alert alert-info">
							This blueprint has been deleted or is no longer available.
						</div>
					)}
					<Link
						to="/"
						className="btn btn-primary"
					>
						Return to Home
					</Link>
				</div>
			</>
		);
	}

	const isOwner = user && user.uid === blueprintData?.author?.userId;
	const disqusConfig: DisqusConfig = {
		url: `https://factorioprints.com/view/${blueprintId}`,
		identifier: blueprintId,
		title: blueprintData?.title,
	};

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
						<div className="d-flex gap-2 flex-wrap">
							{(isOwner || isModerator) && renderEditButton()}
							{!isOwner && renderFavoriteButton()}
							{isModerator && renderReconcileButton()}
						</div>
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
						<Card>
							<Card.Header>Info</Card.Header>
							<Table
								bordered
								hover
							>
								<tbody>
									<tr>
										<td>
											<FontAwesomeIcon
												icon={faUser}
												size="lg"
												fixedWidth
											/>
											{' Author'}
										</td>
										<td>
											<DisplayName
												userId={blueprintData?.author?.userId}
												externalIsLoading={blueprintIsLoading}
											/>
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon
												icon={faCalendar}
												size="lg"
												fixedWidth
											/>
											{' Created'}
										</td>
										<td>
											<DateDisplay
												date={blueprintData?.createdDate}
												isLoading={blueprintIsLoading}
											/>
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon
												icon={faClock}
												size="lg"
												fixedWidth
											/>
											{' Last Updated'}
										</td>
										<td>
											<DateDisplay
												date={blueprintData?.lastUpdatedDate}
												isLoading={blueprintIsLoading}
											/>
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon
												icon={faHeart}
												size="lg"
												fixedWidth
											/>
											{' Favorites'}
										</td>
										<td>
											<FavoriteCount
												count={blueprintData?.numberOfFavorites}
												isLoading={blueprintIsLoading}
											/>
										</td>
									</tr>
								</tbody>
							</Table>
						</Card>
						{blueprintWrapper && blueprintWrapper.getType() === 'blueprint' && (
							<Card>
								<Card.Header>Requirements</Card.Header>
								<Table
									bordered
									hover
								>
									<colgroup>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col span={1} />
									</colgroup>

									<tbody>
										{memoizedEntityHistogram.map((pair) => {
											if (typeof pair[0] === 'object' || typeof pair[1] === 'object') {
												return null;
											}
											return (
												<tr key={pair[0]}>
													<td className={`icon icon-${(entitiesWithIcons as any)[pair[0]]}`}>
														{(entitiesWithIcons as any)[pair[0]] ? (
															<FactorioIcon
																icon={{name: pair[0], type: 'item'}}
																size="small"
															/>
														) : (
															''
														)}
													</td>
													<td className="number">{pair[1]}</td>
													<td>{pair[0]}</td>
												</tr>
											);
										})}
										{memoizedItemHistogram.map((pair) => {
											// Skip rendering if key or value is not a primitive to prevent [object Object]
											if (typeof pair[0] === 'object' || typeof pair[1] === 'object') {
												return null;
											}
											return (
												<tr key={pair[0]}>
													<td className={`icon icon-${(entitiesWithIcons as any)[pair[0]]}`}>
														{(entitiesWithIcons as any)[pair[0]] ? (
															<FactorioIcon
																icon={{name: pair[0], type: 'item'}}
																size="small"
															/>
														) : (
															''
														)}
													</td>
													<td className="number">{pair[1]}</td>
													<td>{pair[0]}</td>
												</tr>
											);
										})}
									</tbody>
								</Table>
							</Card>
						)}
						{blueprintWrapper && blueprintWrapper.getType() === 'blueprint' && (
							<Card border="secondary">
								<Card.Header>Extra Info</Card.Header>
								<Table
									bordered
									hover
								>
									<colgroup>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col span={1} />
									</colgroup>

									<tbody>
										<tr>
											<td colSpan={2}>
												{(blueprintData?.parsedData as RawBlueprintData).blueprint?.label}
											</td>
										</tr>
										{((blueprintData?.parsedData as RawBlueprintData).blueprint?.icons || [])
											.filter((icon) => icon !== null)
											.map((icon) => {
												const iconObj = icon as BlueprintIcon;
												const iconName =
													('name' in iconObj
														? String(iconObj.name)
														: String(iconObj.signal?.name || '')) || '';
												return (
													<tr key={(icon as BlueprintIcon).index}>
														<td className={`icon icon-${iconName}`}>
															{iconObj.signal ? (
																<div style={{width: '32px', height: '32px'}}>
																	<FactorioIcon
																		icon={{
																			name: iconObj.signal.name,
																			type: (iconObj.signal.type ||
																				'item') as SignalType,
																			quality: iconObj.signal.quality as Quality,
																		}}
																		size="small"
																	/>
																</div>
															) : null}
														</td>
														<td>{String(iconName)}</td>
													</tr>
												);
											})}
									</tbody>
								</Table>
							</Card>
						)}
					</Col>
					<Col md={8}>
						<Card>
							<Card.Header>Details</Card.Header>
							<Card.Body>
								<BlueprintMarkdownDescription
									renderedMarkdown={blueprintData?.renderedDescription}
									isLoading={blueprintIsLoading}
								/>

								<Button
									type="button"
									variant="warning"
									onClick={() => copyToClipboard(blueprintData?.blueprintString || '')}
								>
									<FontAwesomeIcon
										icon={copiedText ? faCheck : faClipboard}
										size="lg"
										fixedWidth
									/>
									{' Copy to Clipboard'}
								</Button>
								<Button
									type="button"
									onClick={handleShowHideBase64}
								>
									{showBlueprint ? hideButton('Hide Blueprint') : showButton('Show Blueprint')}
								</Button>
								<Button
									type="button"
									onClick={handleShowHideJson}
								>
									{showJson ? hideButton('Hide Json') : showButton('Show Json')}
								</Button>
							</Card.Body>
						</Card>
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
						{blueprintWrapper && blueprintWrapper.getType() === 'blueprint-book' && (
							<Card>
								<Card.Header>Extra Info</Card.Header>
								<Table
									bordered
									hover
								>
									<colgroup>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col span={1} />
									</colgroup>
									<tbody>
										<tr>
											<td colSpan={4}>{'Book'}</td>
											<td>
												{(blueprintData?.parsedData as RawBlueprintData).blueprint_book?.label}
											</td>
										</tr>
										{(blueprintData?.parsedData as RawBlueprintData).blueprint_book?.blueprints.map(
											(eachBlueprint, blueprintIndex) => (
												<tr key={blueprintIndex}>
													{range(4).map((iconIndex) => {
														const entry = getBookEntry(eachBlueprint);
														if (
															entry &&
															entry.icons &&
															entry.icons.length > iconIndex &&
															entry.icons[iconIndex] !== null
														) {
															const icon = entry.icons[iconIndex] as BlueprintIcon;

															const iconName =
																('name' in icon
																	? String(icon.name)
																	: String(icon.signal?.name || '')) || '';
															return (
																<td
																	className={`icon icon-${iconName}`}
																	key={iconIndex}
																>
																	{icon.signal ? (
																		<div style={{width: '32px', height: '32px'}}>
																			<FactorioIcon
																				icon={{
																					name: icon.signal.name,
																					type: (icon.signal.type ||
																						'item') as SignalType,
																					quality: icon.signal
																						.quality as Quality,
																				}}
																				size="small"
																			/>
																		</div>
																	) : null}
																</td>
															);
														}
														return (
															<td
																className="icon"
																key={iconIndex}
															/>
														);
													})}
													<td>
														{eachBlueprint.blueprint
															? eachBlueprint.blueprint.label
															: 'Empty slot in book'}
													</td>
												</tr>
											),
										)}
									</tbody>
								</Table>
							</Card>
						)}
						{blueprintWrapper && blueprintWrapper.getType() === 'upgrade-planner' && (
							<Card>
								<Card.Header>Upgrade Planner</Card.Header>
								<Table
									bordered
									hover
								>
									<colgroup>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col
											span={1}
											style={{width: '1%'}}
										/>
										<col span={1} />
									</colgroup>
									<tbody>
										{(
											(blueprintData?.parsedData as RawBlueprintData).upgrade_planner
												?.settings as any
										)?.mappers?.map(({from, to, index}: any) => (
											<tr key={index}>
												<td className={`icon icon-${from.name}`}>
													{(entitiesWithIcons as any)[from.name] ? (
														<FactorioIcon
															icon={{
																name: from.name,
																type: from.type || 'item',
																quality: from.quality,
															}}
															size="small"
														/>
													) : (
														''
													)}
												</td>
												<td className={`icon icon-${to.name}`}>
													{(entitiesWithIcons as any)[to.name] ? (
														<FactorioIcon
															icon={{
																name: to.name,
																type: to.type || 'item',
																quality: to.quality,
															}}
															size="small"
														/>
													) : (
														''
													)}
												</td>
											</tr>
										))}
									</tbody>
								</Table>
							</Card>
						)}
					</Col>
				</Row>
				{blueprintData && (
					<Row className="w-100">
						<DisqusErrorBoundary>
							<div
								id="disqus_thread"
								style={{minHeight: '100px'}}
							>
								<Disqus.DiscussionEmbed
									shortname="factorio-blueprints"
									config={disqusConfig}
								/>
							</div>
						</DisqusErrorBoundary>
					</Row>
				)}
			</Container>
		</>
	);
}

export default React.memo(SingleBlueprint);
