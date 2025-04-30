import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons';
import {
	faCalendar,
	faClipboard,
	faClock,
	faCog,
	faEdit,
	faHeart,
	faToggleOff,
	faToggleOn,
	faUser,
}                                from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}         from '@fortawesome/react-fontawesome';
import {forbidExtraProps}        from 'airbnb-prop-types';
import Disqus                    from 'disqus-react';
import flatMap                   from 'lodash/flatMap';
import forOwn                    from 'lodash/forOwn';
import countBy                   from 'lodash/fp/countBy';
import flow                      from 'lodash/fp/flow';
import reverse                   from 'lodash/fp/reverse';
import sortBy                    from 'lodash/fp/sortBy';
import toPairs                   from 'lodash/fp/toPairs';
import get                       from 'lodash/get';
import has                       from 'lodash/has';
import isEmpty                   from 'lodash/isEmpty';
import range                     from 'lodash/range';
import MarkdownIt                from 'markdown-it';
import DOMPurify                 from 'dompurify';
import moment                    from 'moment';
import PropTypes                 from 'prop-types';
import React, {useState, useEffect, useCallback} from 'react';
import Badge                     from 'react-bootstrap/Badge';
import Button                    from 'react-bootstrap/Button';
import Card                      from 'react-bootstrap/Card';
import Col                       from 'react-bootstrap/Col';
import Container                 from 'react-bootstrap/Container';
import Image                     from 'react-bootstrap/Image';
import Row                       from 'react-bootstrap/Row';
import Table                     from 'react-bootstrap/Table';
import CopyToClipboard           from 'react-copy-to-clipboard';
import {Helmet}                  from 'react-helmet';
import {connect}                 from 'react-redux';
import {Link, useParams, useLocation, useNavigate} from 'react-router-dom';
import {bindActionCreators}      from 'redux';

import {subscribeToBlueprint, subscribeToModerators, subscribeToUserDisplayName} from '../actions/actionCreators';

import {database}        from '../base';
import {ref, update as dbUpdate} from 'firebase/database';
import Blueprint           from '../Blueprint';
import entitiesWithIcons   from '../data/entitiesWithIcons';
import buildImageUrl       from '../helpers/buildImageUrl';
import {encodeV15ToBase64} from '../parser/decodeFromBase64';

import * as propTypes from '../propTypes';
import * as selectors from '../selectors';

import GoogleAd from './GoogleAd';
import NoMatch  from './NoMatch';

const md = new MarkdownIt({
	html       : true,
	linkify    : true,
	typographer: true,
	breaks     : false,
});

const defaultTableRenderer = md.renderer.rules.table_open || function(tokens, idx, options, env, self)
{
	return self.renderToken(tokens, idx, options);
};

md.renderer.rules.table_open = function(tokens, idx, options, env, self)
{
	tokens[idx].attrSet('class', 'table table-striped table-bordered');
	return defaultTableRenderer(tokens, idx, options, env, self);
};

const SingleBlueprint = ({
	id,
	displayName,
	displayNameLoading,
	subscribeToBlueprint,
	subscribeToUserDisplayName,
	subscribeToModerators,
	loading,
	myFavoritesKeys,
	user,
	blueprint,
	isModerator,
	location,
	history,
	staticContext,
	match,
}) =>
{
	const [state, setState] = useState({
		showBlueprint     : false,
		showJson          : false,
		showConverted     : false,
		thumbnail         : undefined,
		renderedMarkdown  : undefined,
		parsedBlueprint   : undefined,
		ownedByCurrentUser: undefined,
		v15Decoded        : undefined,
	});

	const parseBlueprint = useCallback((blueprintString) =>
	{
		try
		{
			return new Blueprint(blueprintString);
		}
		catch (ignored)
		{
			console.log('SingleBlueprint.parseBlueprint', {ignored});
			return undefined;
		}
	}, []);

	const cacheState = useCallback((props) =>
	{
		if (isEmpty(props.blueprint))
		{
			setState(prevState => ({
				...prevState,
				thumbnail         : undefined,
				renderedMarkdown  : undefined,
				parsedBlueprint   : undefined,
				ownedByCurrentUser: undefined,
				v15Decoded        : undefined,
			}));
			return;
		}

		const {image, descriptionMarkdown, blueprintString, author: {userId: authorId}} = props.blueprint;
		// Blueprint author
		subscribeToUserDisplayName(authorId);

		const thumbnail = buildImageUrl(image.id, image.type, 'l');
		const renderedMarkdown = DOMPurify.sanitize(md.render(descriptionMarkdown || ''));
		const ownedByCurrentUser = props.user && props.user.uid === authorId;
		const parsedBlueprint = parseBlueprint(blueprintString);
		const v15Decoded = parsedBlueprint && parsedBlueprint.getV15Decoded();

		setState(prevState => ({
			...prevState,
			thumbnail,
			renderedMarkdown,
			parsedBlueprint,
			ownedByCurrentUser,
			v15Decoded,
		}));
	}, [parseBlueprint, subscribeToUserDisplayName]);

	useEffect(() =>
	{
		subscribeToBlueprint(id);
		if (!isEmpty(user))
		{
			subscribeToModerators();
		}
		cacheState({blueprint, user});
		window.scrollTo(0, 0);
	}, [id, subscribeToBlueprint, subscribeToModerators, user, blueprint, cacheState]);

	useEffect(() =>
	{
		cacheState({blueprint, user});
	}, [blueprint, user, cacheState]);

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

	const handleFavorite = useCallback(() =>
	{
		const {uid} = user;
		const {numberOfFavorites} = blueprint;
		const wasFavorite = myFavoritesKeys[id];
		const newNumberOfFavorites = numberOfFavorites + (wasFavorite ? -1 : 1);

		const updates = {
			[`/blueprints/${id}/numberOfFavorites`]        : newNumberOfFavorites,
			[`/blueprints/${id}/favorites/${uid}`]         : wasFavorite ? null : true,
			[`/blueprintSummaries/${id}/numberOfFavorites`]: newNumberOfFavorites,
			[`/users/${uid}/favorites/${id}`]              : wasFavorite ? null : true,
		};

		dbUpdate(ref(database), updates);
	}, [user, blueprint, myFavoritesKeys, id]);

	const handleShowHideBase64 = useCallback(() =>
	{
		setState(prevState => ({
			...prevState,
			showBlueprint: !prevState.showBlueprint,
		}));
	}, []);

	const handleShowHideJson = useCallback(() =>
	{
		setState(prevState => ({
			...prevState,
			showJson: !prevState.showJson,
		}));
	}, []);

	const handleShowHideConverted = useCallback(() =>
	{
		setState(prevState => ({
			...prevState,
			showConverted: !prevState.showConverted,
		}));
	}, []);

	const handleTransitionToEdit = useCallback(() =>
	{
		history.push(`/edit/${id}`);
	}, [history, id]);

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

	const getAuthorName = useCallback(() =>
	{
		if (displayNameLoading)
		{
			return 'Author name loading';
		}
		if (displayName)
		{
			return displayName;
		}
		return '(Anonymous)';
	}, [displayNameLoading, displayName]);

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

		const myFavorite = myFavoritesKeys[id];
		const heart = myFavorite ? faHeart : regularHeart;
		const iconClass = myFavorite ? 'text-warning' : 'text-default';

		return (
			<Button size='lg' onClick={handleFavorite}>
				<FontAwesomeIcon icon={heart} className={iconClass} />
				{' Favorite'}
			</Button>
		);
	}, [user, myFavoritesKeys, id, handleFavorite]);

	if (isEmpty(blueprint))
	{
		if (loading === true || loading === undefined)
		{
			return (
				<>
					<Helmet>
						<title>
							Factorio Prints: Loading Data
						</title>
					</Helmet>
					<div className='p-5 rounded-lg jumbotron'>
						<h1 className='display-4'>
							<FontAwesomeIcon icon={faCog} spin />
							{' Loading data'}
						</h1>
					</div>
				</>
			);
		}

		return <NoMatch />;
	}

	const {image, createdDate, lastUpdatedDate, author: {userId: authorId}, title, numberOfFavorites} = blueprint;
	if (isEmpty(blueprint.tags)) blueprint.tags = [];
	blueprint.tags = blueprint.tags.filter(tag => tag.tag !== null);

	const disqusConfig = {
		url       : `https://factorioprints.com${location.pathname}`,
		identifier: id,
		title     : blueprint.title,
	};

	return (
		<>
			<Helmet>
				<title>
					{`Factorio Prints: ${title}`}
				</title>
			</Helmet>
			<Container>
				<Row>
					<Col md={9}>
						<div className='d-flex mt-4'>
							<h1>
								{title}
							</h1>

						</div>
					</Col>
					<Col md={3} className='d-flex align-items-center justify-content-end'>
						{(state.ownedByCurrentUser || isModerator) && renderEditButton()}
						{!state.ownedByCurrentUser && renderFavoriteButton()}
					</Col>
				</Row>
				<Row>
					<Col md={4}>
						<a
							href={`http://imgur.com/${image.id}`}
							target='_blank'
							rel='noopener noreferrer'
						>
							<Image thumbnail className='border-warning' src={state.thumbnail} referrerPolicy='no-referrer' />
						</a>
						{
							blueprint.tags && blueprint.tags.length > 0 && <Card>
								<Card.Header>
									Tags
								</Card.Header>
								<Card.Body>
									<h4>
										{
											flatMap(blueprint.tags, tag => (
												<Link key={tag} to={`/tagged${tag}`} className='m-1'>
													<Badge bg='warning' text='light'>
														{tag}
													</Badge>
												</Link>
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
											<Link to={`/user/${authorId}`}>
												{getAuthorName()}
												{
													state.ownedByCurrentUser
													&& <span className='pull-right'>
														<b>
															{'(You)'}
														</b>
													</span>
												}
											</Link>
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon icon={faCalendar} size='lg' fixedWidth />
											{' Created'}
										</td>
										<td>
											<span
												title={moment(createdDate).format('dddd, MMMM Do YYYY, h:mm:ss a')}
											>
												{moment(createdDate).fromNow()}
											</span>
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
											{' Last Updated'}
										</td>
										<td>
											<span
												title={moment(lastUpdatedDate).format('dddd, MMMM Do YYYY, h:mm:ss a')}
											>
												{moment(lastUpdatedDate).fromNow()}
											</span>
										</td>
									</tr>
									<tr>
										<td>
											<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
											{' Favorites'}
										</td>
										<td>
											{numberOfFavorites}
										</td>
									</tr>
								</tbody>
							</Table>
						</Card>
						{
							state.parsedBlueprint && state.v15Decoded && state.parsedBlueprint.isBlueprint()
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
											entityHistogram(state.v15Decoded.blueprint).map((pair) =>
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
																	? <img height='32px' width='32px' src={`/icons/${pair[0]}.png`} alt={pair[0]} />
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
											itemHistogram(state.v15Decoded.blueprint).map((pair) =>
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
																	? <img height='32px' width='32px' src={`/icons/${pair[0]}.png`} alt={pair[0]} />
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
							state.parsedBlueprint && state.v15Decoded && state.parsedBlueprint.isBlueprint()
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
												{state.v15Decoded.blueprint.label}
											</td>
										</tr>
										{
											(state.v15Decoded.blueprint.icons || [])
												.filter(icon => icon !== null)
												.map((icon) =>
												{
													// eslint-disable-next-line
													const iconName = icon.name || icon.signal && icon.signal.name;
													return (
														<tr key={icon.index}>
															<td className={`icon icon-${iconName}`}>
																{
																	entitiesWithIcons[iconName]
																		? <img height='32px' width='32px' src={`/icons/${iconName}.png`} alt={iconName} />
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
						<GoogleAd />
					</Col>
					<Col md={8}>
						<Card>
							<Card.Header>
								Details
							</Card.Header>
							<Card.Body>
								<div dangerouslySetInnerHTML={{__html: state.renderedMarkdown}} />

								<CopyToClipboard text={blueprint.blueprintString}>
									<Button type='button' variant='warning'>
										<FontAwesomeIcon icon={faClipboard} size='lg' fixedWidth />
										{' Copy to Clipboard'}
									</Button>
								</CopyToClipboard>
								<Button type='button' onClick={handleShowHideBase64}>
									{
										state.showBlueprint
											? hideButton('Hide Blueprint')
											: showButton('Show Blueprint')
									}
								</Button>
								<Button type='button' onClick={handleShowHideJson}>
									{
										state.showJson
											? hideButton('Hide Json')
											: showButton('Show Json')
									}
								</Button>
								{
									state.parsedBlueprint && state.parsedBlueprint.isV14()
									&& <Button type='button' onClick={handleShowHideConverted}>
										{
											state.showConverted
												? hideButton('Hide 0.15 blueprint')
												: showButton('Convert to 0.15 blueprint')
										}
									</Button>
								}

							</Card.Body>
						</Card>
						{
							state.showBlueprint && <Card>
								<Card.Header>
									Blueprint String
								</Card.Header>
								<Card.Body>
									<div className='blueprintString'>
										{blueprint.blueprintString}
									</div>
								</Card.Body>
							</Card>
						}
						{
							state.showJson && <Card>
								<Card.Header>
									Json Representation
								</Card.Header>
								<Card.Body className='code'>
									{JSON.stringify(state.v15Decoded, null, 4)}
								</Card.Body>
							</Card>
						}
						{
							state.showConverted && <Card>
								<Card.Header>
									0.15 format Blueprint String (Experimental)
								</Card.Header>
								<div className='blueprintString'>
									{encodeV15ToBase64(JSON.stringify(state.v15Decoded))}
								</div>
							</Card>
						}
						{
							state.parsedBlueprint && state.v15Decoded && state.parsedBlueprint.isBook()
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
												{state.v15Decoded.blueprint_book.label}
											</td>
										</tr>
										{
											state.v15Decoded.blueprint_book.blueprints.map((eachBlueprint, blueprintIndex) => (
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
																// eslint-disable-next-line
																const iconName = icon.name || icon.signal && icon.signal.name;
																return (
																	<td className={`icon icon-${iconName}`} key={iconIndex}>
																		{
																			entitiesWithIcons[iconName]
																				? <img height='32px' width='32px' src={`/icons/${iconName}.png`} alt={iconName} />
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
							state.parsedBlueprint && state.v15Decoded && state.parsedBlueprint.isUpgradePlanner()
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
											state.v15Decoded.upgrade_planner.settings.mappers.map(({from, to, index}) => (
												<tr key={index}>
													<td className={`icon icon-${from.name}`}>
														{
															entitiesWithIcons[from.name]
																? <img height='32px' width='32px' src={`/icons/${from.name}.png`} alt={from.name} />
																: ''
														}
													</td>
													<td className={`icon icon-${to.name}`}>
														{
															entitiesWithIcons[to.name]
																? <img height='32px' width='32px' src={`/icons/${to.name}.png`} alt={to.name} />
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
};

SingleBlueprint.propTypes = forbidExtraProps({
	id                        : PropTypes.string.isRequired,
	displayName               : PropTypes.string,
	displayNameLoading        : PropTypes.bool.isRequired,
	subscribeToBlueprint      : PropTypes.func.isRequired,
	subscribeToUserDisplayName: PropTypes.func.isRequired,
	// TODO: Only bother if we're logged in
	subscribeToModerators     : PropTypes.func.isRequired,
	loading                   : PropTypes.bool.isRequired,
	myFavoritesKeys           : PropTypes.objectOf(PropTypes.bool.isRequired),
	user                      : propTypes.userSchema,
	blueprint                 : propTypes.blueprintSchema,
	isModerator               : PropTypes.bool.isRequired,
	location                  : propTypes.locationSchema,
	history                   : propTypes.historySchema,
	staticContext             : PropTypes.shape(forbidExtraProps({})),
	match                     : PropTypes.shape(forbidExtraProps({
		params: PropTypes.shape(forbidExtraProps({
			blueprintId: PropTypes.string.isRequired,
		})).isRequired,
		path   : PropTypes.string.isRequired,
		url    : PropTypes.string.isRequired,
		isExact: PropTypes.bool.isRequired,
	})).isRequired,
});

const mapStateToProps = (storeState, ownProps) =>
{
	const id = ownProps.match.params.blueprintId;
	const blueprint = selectors.getBlueprintDataById(storeState, {id});

	return {
		id,
		user              : selectors.getFilteredUser(storeState),
		isModerator       : selectors.getIsModerator(storeState),
		blueprint         : selectors.getBlueprintDataById(storeState, {id}),
		loading           : selectors.getBlueprintLoadingById(storeState, {id}),
		myFavoritesKeys   : selectors.getMyFavoritesKeys(storeState),
		displayName       : selectors.getUserDisplayName(storeState, {id: get(blueprint, ['author', 'userId'])}),
		displayNameLoading: selectors.getUserDisplayNameLoading(storeState, {id}),
	};
};

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		subscribeToBlueprint,
		subscribeToModerators,
		subscribeToUserDisplayName,
	};
	return bindActionCreators(actionCreators, dispatch);
};

const ConnectedSingleBlueprint = connect(mapStateToProps, mapDispatchToProps)(SingleBlueprint);

// Wrapper to provide router props to functional component
function SingleBlueprintWrapper()
{
	const params = useParams();
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<ConnectedSingleBlueprint
			id={params.blueprintId}
			location={location}
			history={{push: navigate}}
			match={{
				params : {blueprintId: params.blueprintId},
				path   : '/view/:blueprintId',
				url    : `/view/${params.blueprintId}`,
				isExact: true,
			}}
		/>
	);
}

export default SingleBlueprintWrapper;
