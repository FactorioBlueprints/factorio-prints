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
}                                from '@fortawesome/free-solid-svg-icons';
import {
	FontAwesomeIcon,
}                                from '@fortawesome/react-fontawesome';
import {
	Link,
	useNavigate,
	useParams,
}                                from '@tanstack/react-router';
import Disqus                    from 'disqus-react';
import {
	getAuth,
}                                from 'firebase/auth';
import flatMap                   from 'lodash/flatMap';
import forOwn                    from 'lodash/forOwn';
import countBy                   from 'lodash/fp/countBy';
import flow                      from 'lodash/fp/flow';
import reverse                   from 'lodash/fp/reverse';
import sortBy                    from 'lodash/fp/sortBy';
import toPairs                   from 'lodash/fp/toPairs';
import has                       from 'lodash/has';
import range                     from 'lodash/range';
import React, {
	useCallback,
	useEffect,
	useState,
}                                from 'react';
import Badge                     from 'react-bootstrap/Badge';
import Button                    from 'react-bootstrap/Button';
import Card                      from 'react-bootstrap/Card';
import Col                       from 'react-bootstrap/Col';
import Container                 from 'react-bootstrap/Container';
import Row                       from 'react-bootstrap/Row';
import Table                     from 'react-bootstrap/Table';
import {
	useAuthState,
}                                from 'react-firebase-hooks/auth';
import {
	Helmet,
}                                from 'react-helmet-async';
import {
	useCopyToClipboard,
}                                from 'usehooks-ts';

import {app}                         from '../base';
import entitiesWithIcons             from '../data/entitiesWithIcons';
import {useEnrichedBlueprint}        from '../hooks/useEnrichedBlueprint';
import {useEnrichedBlueprintSummary} from '../hooks/useEnrichedBlueprintSummary';
import {useIsFavorite}               from '../hooks/useBlueprintFavorite';
import {useIsModerator}              from '../hooks/useModerators';
import useReconcileFavoritesMutation from '../hooks/useReconcileFavorites';
import useToggleFavoriteMutation     from '../hooks/useToggleFavoriteMutation.js';
import {BlueprintWrapper}            from '../parsing/BlueprintWrapper.js';
import BlueprintImage                from './BlueprintImage';
import BlueprintMarkdownDescription  from './BlueprintMarkdownDescription';
import BlueprintTitle                from './BlueprintTitle';
import DateDisplay                   from './DateDisplay';

import DisplayName   from './DisplayName';
import FavoriteCount from './FavoriteCount';
import TagBadge      from './TagBadge';

function SingleBlueprintWithQuery()
{
	const { blueprintId } = useParams({ from: '/view/$blueprintId' });
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

	const {
			  data: isFavorite,
			  isSuccess: favoriteIsSuccess,
		  } = useIsFavorite(user?.uid, blueprintId);

	const [showBlueprint, setShowBlueprint] = useState(false);
	const [showJson, setShowJson] = useState(false);

	const [copiedText, copyToClipboard] = useCopyToClipboard();

	const initialLoadRef = React.useRef(true);

	// Scroll to top on initial data load
	useEffect(() =>
	{
		if (blueprintIsSuccess && initialLoadRef.current)
		{
			window.scrollTo(0, 0);
			initialLoadRef.current = false;
		}
	}, [blueprintIsSuccess]);

	const hideButton = useCallback((text) => (
		<>
			<FontAwesomeIcon icon={faToggleOn} size='lg' fixedWidth className='text-success' />
			{` ${text}`}
		</>
	), []);

	const showButton = useCallback((text) => (
		<>
			<FontAwesomeIcon icon={faToggleOff} size='lg' fixedWidth />
			{` ${text}`}
		</>
	), []);

	const favoriteBlueprintMutation = useToggleFavoriteMutation();
	const reconcileFavoritesMutation = useReconcileFavoritesMutation();

	const handleFavorite = useCallback(() =>
	{
		if (!user) return;
		if (!favoriteIsSuccess) return;
		if (!blueprintData) return;

		const {uid} = user;

		favoriteBlueprintMutation.mutate({
			blueprintId,
			userId           : uid,
			isFavorite,
			numberOfFavorites: blueprintData.numberOfFavorites || 0,
		}, {
			retry  : 1,
			onError: (error) =>
			{
				console.error('Error toggling favorite status:', error);
			},
		});
	}, [user, isFavorite, favoriteIsSuccess, blueprintId, blueprintData, favoriteBlueprintMutation]);

	const handleShowHideBase64 = useCallback(() =>
	{
		setShowBlueprint(prevState => !prevState);
	}, []);

	const handleShowHideJson = useCallback(() =>
	{
		setShowJson(prevState => !prevState);
	}, []);

	const handleTransitionToEdit = useCallback(() =>
	{
		navigate({ to: '/edit/$blueprintId', params: { blueprintId } });
	}, [navigate, blueprintId]);

	const handleReconcileFavorites = useCallback(() =>
	{
		reconcileFavoritesMutation.mutate(blueprintId);
	}, [blueprintId, reconcileFavoritesMutation]);

	const entityHistogram = useCallback((parsedBlueprint) =>
	{
		const validEntities = (parsedBlueprint.entities || []).concat(parsedBlueprint.tiles || [])
			.filter(entity => typeof entity.name === 'string' || typeof entity.name === 'number');

		return flow(
			countBy('name'),
			toPairs,
			sortBy(1),
			reverse,
		)(validEntities);
	}, []);

	const itemHistogram = useCallback((parsedBlueprint) =>
	{
		const result = {};
		const items = flatMap(parsedBlueprint.entities, entity => entity.items || []);

		items.forEach((item) =>
		{
			// Handle original format: {item: "copper-cable", count: 5}
			if (has(item, 'item') && has(item, 'count'))
			{
				result[item.item] = (result[item.item] || 0) + item.count;
			}
			// Handle new format with id.name and items structure
			else if (has(item, 'id') && has(item.id, 'name'))
			{
				const itemName = item.id.name;
				// Count the number of stacks if items.in_inventory exists
				if (has(item, 'items') && has(item.items, 'in_inventory'))
				{
					const stackCount = item.items.in_inventory.length;
					result[itemName] = (result[itemName] || 0) + stackCount;
				}
				// Just count it once if we can't determine the stack count
				else
				{
					result[itemName] = (result[itemName] || 0) + 1;
				}
			}
			// Handle old style direct key-value pairs: {"copper-cable": 5}
			else if (typeof item === 'object')
			{
				forOwn(item, (value, key) =>
				{
					// Skip non-primitive values that might cause [object Object] rendering
					if (typeof value !== 'object' || value === null)
					{
						result[key] = (result[key] || 0) + value;
					}
				});
			}
		});

		return flow(
			toPairs,
			sortBy(1),
			reverse,
		)(result);
	}, []);

	const getBookEntry = useCallback((eachBlueprint) =>
	{
		if (eachBlueprint.blueprint)
		{
			return eachBlueprint.blueprint;
		}

		if (eachBlueprint.upgrade_planner)
		{
			return eachBlueprint.upgrade_planner;
		}

		if (eachBlueprint.deconstruction_planner)
		{
			return eachBlueprint.deconstruction_planner;
		}

		return eachBlueprint.blueprint_book;
	}, []);

	const renderEditButton = useCallback(() => (
		<Button
			size='lg'
			onClick={handleTransitionToEdit}
		>
			<FontAwesomeIcon icon={faEdit} />
			{' Edit'}
		</Button>
	), [handleTransitionToEdit]);

	const renderFavoriteButton = useCallback(() =>
	{
		if (!user)
		{
			return <div />;
		}

		const heart = isFavorite ? faHeart : regularHeart;
		const iconClass = isFavorite ? 'text-warning' : 'text-default';

		return (
			<Button
				size='lg'
				onClick={handleFavorite}
				disabled={favoriteBlueprintMutation.isPending}
			>
				{/*// TODO 2025-04-22: Change the icon to a spinning cog if isPending*/}
				<FontAwesomeIcon icon={heart} className={iconClass} />
				{' Favorite'}
			</Button>
		);
	}, [user, isFavorite, handleFavorite, favoriteBlueprintMutation.isPending]);

	const renderReconcileButton = useCallback(() =>
	{
		const { data: reconcileResult, isPending, isSuccess } = reconcileFavoritesMutation;
		const buttonText = isPending
			? ' Reconciling...'
			: (isSuccess && reconcileResult?.hasDiscrepancy)
				? ` Fixed (${reconcileResult.actualCount} favorites)`
				: (isSuccess && !reconcileResult?.hasDiscrepancy)
					? ' No issues found'
					: ' Reconcile Favorites';

		const buttonVariant = isSuccess
			? (reconcileResult?.hasDiscrepancy ? "success" : "info")
			: "secondary";

		const tooltipText = isSuccess
			? (reconcileResult?.hasDiscrepancy
				? `Fixed: ${reconcileResult.previousBlueprintCount} → ${reconcileResult.actualCount} favorites`
				: "No discrepancy detected")
			: "Reconcile favorites count";

		return (
			<Button
				size='lg'
				variant={buttonVariant}
				onClick={handleReconcileFavorites}
				disabled={isPending}
				title={tooltipText}
			>
				<FontAwesomeIcon icon={faSync} spin={isPending} />
				{buttonText}
			</Button>
		);
	}, [handleReconcileFavorites, reconcileFavoritesMutation]);

	const memoizedEntityHistogram = React.useMemo(
		() =>
		{
			return blueprintData?.parsedData?.blueprint ? entityHistogram(blueprintData.parsedData.blueprint) : [];
		},
		[blueprintData?.parsedData, entityHistogram],
	);

	const memoizedItemHistogram = React.useMemo(
		() =>
		{
			return blueprintData?.parsedData?.blueprint ? itemHistogram(blueprintData.parsedData.blueprint) : [];
		},
		[blueprintData?.parsedData, itemHistogram],
	);

	// Clean up Disqus on unmount to prevent DOM manipulation errors
	useEffect(() =>
	{
		return () =>
		{
			if (window.DISQUS)
			{
				try
				{
					window.DISQUS.reset({
						reload: false,
					});
				}
				catch
				{
					// Silently ignore Disqus cleanup errors
				}
			}
		};
	}, []);

	const error = summaryError || blueprintError;
	const isDeleted = summaryIsSuccess && !blueprintSummary;

	if (error || isDeleted)
	{
		return (
			<>
				<Helmet>
					<title>
						Factorio Prints: Blueprint Not Found
					</title>
				</Helmet>
				<div className='p-5 rounded-lg jumbotron'>
					<h1 className='display-4'>
						Blueprint Not Found
					</h1>
					<p>The blueprint you're looking for could not be found.</p>
					{error && (
						<div className='alert alert-danger'>
							<strong>Error:</strong> {error.message || 'An unknown error occurred'}
						</div>
					)}
					{isDeleted && (
						<div className='alert alert-info'>
							This blueprint has been deleted or is no longer available.
						</div>
					)}
					<Link to='/' className='btn btn-primary'>
						Return to Home
					</Link>
				</div>
			</>
		);
	}

	const isOwner = user && user.uid === blueprintData?.author?.userId;
	const disqusConfig = {
		url       : `https://factorioprints.com/view/${blueprintId}`,
		identifier: blueprintId,
		title     : blueprintData?.title,
	};

	return (
		<>
			<Helmet>
				<title>
					{blueprintIsLoading ? "Factorio Prints: Loading..." : `Factorio Prints: ${(blueprintData?.title)}`}
				</title>
			</Helmet>
			<Container>
				<Row>
					<Col md={9}>
						<div className='d-flex mt-4'>
							<BlueprintTitle title={blueprintData?.title} isLoading={blueprintIsLoading} />
						</div>
					</Col>
					<Col md={3} className='d-flex align-items-center justify-content-end'>
						<div className='d-flex gap-2 flex-wrap'>
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
						{
							tagsData && tagsData.length > 0 && <Card>
								<Card.Header>
									Tags
								</Card.Header>
								<Card.Body>
									<h4>
										{
											flatMap(tagsData, tag => (
												<TagBadge key={tag} tag={tag} />
											))
										}
									</h4>
								</Card.Body>
							</Card>
						}
						<Card>
							<Card.Header>
								Info
							</Card.Header>
							<Table bordered hover>
								<tbody>
									<tr>
										<td>
											<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
											{' Author'}
										</td>
										<td>
											<DisplayName userId={blueprintData?.author?.userId} externalIsLoading={blueprintIsLoading} />
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon icon={faCalendar} size='lg' fixedWidth />
											{' Created'}
										</td>
										<td>
											<DateDisplay date={blueprintData?.createdDate} isLoading={blueprintIsLoading} />
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
											{' Last Updated'}
										</td>
										<td>
											<DateDisplay date={blueprintData?.lastUpdatedDate} isLoading={blueprintIsLoading} />
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
											{' Favorites'}
										</td>
										<td>
											<FavoriteCount count={blueprintData?.numberOfFavorites} isLoading={blueprintIsLoading} />
										</td>
									</tr>
								</tbody>
							</Table>
						</Card>
						{
							blueprintWrapper && blueprintWrapper.getType() === 'blueprint'
							&& <Card>
								<Card.Header>
									Requirements
								</Card.Header>
								<Table bordered hover>
									<colgroup>
										<col span='1' style={{width: '1%'}} />
										<col span='1' style={{width: '1%'}} />
										<col span='1' />
									</colgroup>

									<tbody>
										{
											memoizedEntityHistogram.map((pair) =>
											{
												if (typeof pair[0] === 'object' || typeof pair[1] === 'object')
												{
													return null;
												}
												return (
													<tr key={pair[0]}>
														<td className={`icon icon-${entitiesWithIcons[pair[0]]}`}>
															{
																entitiesWithIcons[pair[0]]
																	? <img
																		height='32px'
																		width='32px'
																		src={`/icons/${pair[0]}.png`}
																		alt={pair[0]}
																		onError={(e) =>
																		{
																			e.target.onerror = null;
																			e.target.src = '/icons/entity-unknown.png';
																		}}
																	/>
																	: ''
															}
														</td>
														<td className='number'>
															{pair[1]}
														</td>
														<td>
															{pair[0]}
														</td>
													</tr>
												);
											})
										}
										{
											memoizedItemHistogram.map((pair) =>
											{
												// Skip rendering if key or value is not a primitive to prevent [object Object]
												if (typeof pair[0] === 'object' || typeof pair[1] === 'object')
												{
													return null;
												}
												return (
													<tr key={pair[0]}>
														<td className={`icon icon-${entitiesWithIcons[pair[0]]}`}>
															{
																entitiesWithIcons[pair[0]]
																	? <img
																		height='32px'
																		width='32px'
																		src={`/icons/${pair[0]}.png`}
																		alt={pair[0]}
																		onError={(e) =>
																		{
																			e.target.onerror = null;
																			e.target.src = '/icons/entity-unknown.png';
																		}}
																	/>
																	: ''
															}
														</td>
														<td className='number'>
															{pair[1]}
														</td>
														<td>
															{pair[0]}
														</td>
													</tr>
												);
											})
										}
									</tbody>
								</Table>
							</Card>
						}
						{
							blueprintWrapper && blueprintWrapper.getType() === 'blueprint'
							&& <Card border='secondary'>
								<Card.Header>
									Extra Info
								</Card.Header>
								<Table bordered hover>
									<colgroup>
										<col span='1' style={{width: '1%'}} />
										<col span='1' />
									</colgroup>

									<tbody>
										<tr>
											<td colSpan={2}>
												{blueprintData?.parsedData.blueprint.label}
											</td>
										</tr>
										{
											(blueprintData?.parsedData.blueprint.icons || [])
												.filter(icon => icon !== null)
												.map((icon) =>
												{
													const iconName = icon.name || icon.signal && icon.signal.name;
													return (
														<tr key={icon.index}>
															<td className={`icon icon-${iconName}`}>
																{
																	entitiesWithIcons[iconName]
																		? <img
																			height='32px'
																			width='32px'
																			src={`/icons/${iconName}.png`}
																			alt={iconName}
																			onError={(e) =>
																			{
																				console.log('Image error (entities):', e.target.src);
																				try
																				{
																					e.target.onerror = null;
																					e.target.src = '/icons/entity-unknown.png';
																				}
																				catch (err)
																				{
																					console.error('Error in image error handler:', err);
																				}
																			}}
																		/>
																		: ''
																}
															</td>
															<td>
																{iconName}
															</td>
														</tr>
													);
												})
										}
									</tbody>
								</Table>
							</Card>
						}
					</Col>
					<Col md={8}>
						<Card>
							<Card.Header>
								Details
							</Card.Header>
							<Card.Body>
								<BlueprintMarkdownDescription renderedMarkdown={blueprintData?.renderedDescription} isLoading={blueprintIsLoading} />

								<Button
									type='button'
									variant='warning'
									onClick={() => copyToClipboard(blueprintData?.blueprintString)}
								>
									<FontAwesomeIcon
										icon={copiedText ? faCheck : faClipboard}
										size='lg'
										fixedWidth
									/>
									{' Copy to Clipboard'}
								</Button>
								<Button type='button' onClick={handleShowHideBase64}>
									{
										showBlueprint
											? hideButton('Hide Blueprint')
											: showButton('Show Blueprint')
									}
								</Button>
								<Button type='button' onClick={handleShowHideJson}>
									{
										showJson
											? hideButton('Hide Json')
											: showButton('Show Json')
									}
								</Button>
							</Card.Body>
						</Card>
						{
							showBlueprint && <Card>
								<Card.Header>
									Blueprint String
								</Card.Header>
								<Card.Body>
									<div className='blueprintString'>
										{blueprintData?.blueprintString}
									</div>
								</Card.Body>
							</Card>
						}
						{
							showJson && <Card>
								<Card.Header>
									Json Representation
								</Card.Header>
								<Card.Body className='code'>
									{JSON.stringify(blueprintData?.parsedData, null, 4)}
								</Card.Body>
							</Card>
						}
						{
							blueprintWrapper && blueprintWrapper.getType() === 'blueprint-book'
							&& <Card>
								<Card.Header>
									Extra Info
								</Card.Header>
								<Table bordered hover>
									<colgroup>
										<col span='1' style={{width: '1%'}} />
										<col span='1' style={{width: '1%'}} />
										<col span='1' style={{width: '1%'}} />
										<col span='1' style={{width: '1%'}} />
										<col span='1' />
									</colgroup>
									<tbody>
										<tr>
											<td colSpan={4}>
												{'Book'}
											</td>
											<td>
												{blueprintData?.parsedData.blueprint_book.label}
											</td>
										</tr>
										{
											blueprintData?.parsedData.blueprint_book.blueprints.map((eachBlueprint, blueprintIndex) => (
												<tr key={blueprintIndex}>
													{
														range(4).map((iconIndex) =>
														{
															const entry = getBookEntry(eachBlueprint);
															if (entry.icons
																&& entry.icons.length > iconIndex
																&& entry.icons[iconIndex] !== null)
															{
																const icon = entry.icons[iconIndex];

																const iconName = icon.name || icon.signal && icon.signal.name;
																return (
																	<td className={`icon icon-${iconName}`} key={iconIndex}>
																		{
																			entitiesWithIcons[iconName]
																				? <img
																					height='32px'
																					width='32px'
																					src={`/icons/${iconName}.png`}
																					alt={iconName}
																					onError={(e) =>
																					{
																						e.target.onerror = null;
																						e.target.src = '/icons/entity-unknown.png';
																					}}
																				/>
																				: ''
																		}
																	</td>
																);
															}
															return <td className='icon' key={iconIndex} />;
														})
													}
													<td>
														{/* Old 0.14 blueprint books could have empty slots */}
														{eachBlueprint.blueprint ? eachBlueprint.blueprint.label : 'Empty slot in book'}
													</td>
												</tr>
											))
										}
									</tbody>
								</Table>
							</Card>
						}
						{
							blueprintWrapper && blueprintWrapper.getType() === 'upgrade-planner'
							&& <Card>
								<Card.Header>
									Upgrade Planner
								</Card.Header>
								<Table bordered hover>
									<colgroup>
										<col span='1' style={{width: '1%'}} />
										<col span='1' style={{width: '1%'}} />
										<col span='1' />
									</colgroup>
									<tbody>
										{
											blueprintData?.parsedData.upgrade_planner.settings.mappers.map(({from, to, index}) => (
												<tr key={index}>
													<td className={`icon icon-${from.name}`}>
														{
															entitiesWithIcons[from.name]
																? <img
																	height='32px'
																	width='32px'
																	src={`/icons/${from.name}.png`}
																	alt={from.name}
																	onError={(e) =>
																	{
																		e.target.onerror = null;
																		e.target.src = '/icons/entity-unknown.png';
																	}}
																/>
																: ''
														}
													</td>
													<td className={`icon icon-${to.name}`}>
														{
															entitiesWithIcons[to.name]
																? <img
																	height='32px'
																	width='32px'
																	src={`/icons/${to.name}.png`}
																	alt={to.name}
																	onError={(e) =>
																	{
																		e.target.onerror = null;
																		e.target.src = '/icons/entity-unknown.png';
																	}}
																/>
																: ''
														}
													</td>
												</tr>
											))
										}
									</tbody>
								</Table>
							</Card>
						}
					</Col>
				</Row>
				<Row className='w-100'>
					<Disqus.DiscussionEmbed
						shortname='factorio-blueprints'
						config={disqusConfig}
						className='w-100'
					/>
				</Row>
			</Container>
		</>
	);
}

export default React.memo(SingleBlueprintWithQuery);
