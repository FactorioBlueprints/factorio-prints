/* eslint-disable react/no-array-index-key */

import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons';
import {
	faCalendar,
	faClipboard,
	faClock,
	faCog,
	faLink,
	faHeart,
	faToggleOff,
	faToggleOn,
	faUser,
}                                from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}         from '@fortawesome/react-fontawesome';
import {forbidExtraProps}        from 'airbnb-prop-types';
import concat                    from 'lodash/concat';
import flatMap                   from 'lodash/flatMap';
import forOwn                    from 'lodash/forOwn';
import countBy                   from 'lodash/fp/countBy';
import flow                      from 'lodash/fp/flow';
import reverse                   from 'lodash/fp/reverse';
import sortBy                    from 'lodash/fp/sortBy';
import toPairs                   from 'lodash/fp/toPairs';
import get                       from 'lodash/get';
import has                       from 'lodash/has';
import includes                  from 'lodash/includes';
import isEmpty                   from 'lodash/isEmpty';
import isEqual                   from 'lodash/isEqual';
import range                     from 'lodash/range';
import marked                    from 'marked';
import moment                    from 'moment';
import PropTypes                 from 'prop-types';
import React, {PureComponent}    from 'react';
import Badge                     from 'react-bootstrap/Badge';
import Button                    from 'react-bootstrap/Button';
import Card                      from 'react-bootstrap/Card';
import Col                       from 'react-bootstrap/Col';
import Container                 from 'react-bootstrap/Container';
import Image                     from 'react-bootstrap/Image';
import Jumbotron                 from 'react-bootstrap/Jumbotron';
import Row                       from 'react-bootstrap/Row';
import Table                     from 'react-bootstrap/Table';
import CopyToClipboard           from 'react-copy-to-clipboard';
import DocumentTitle             from 'react-document-title';
import {connect}                 from 'react-redux';
import {Link}                    from 'react-router-dom';
import {bindActionCreators}      from 'redux';

import {subscribeToBlueprint, subscribeToUserDisplayName} from '../actions/actionCreators';

import Blueprint           from '../Blueprint';
import entitiesWithIcons   from '../data/entitiesWithIcons';
import buildImageUrl       from '../helpers/buildImageUrl';
import {encodeV15ToBase64} from '../parser/decodeFromBase64';

import * as propTypes      from '../propTypes';
import BlueprintProjection from '../propTypes/BlueprintProjection';
import myPropTypes         from '../propTypes/myPropTypes';
import * as selectors      from '../selectors';

import GoogleAd from './GoogleAd';
import NoMatch  from './NoMatch';

const renderer = new marked.Renderer();
renderer.table = (header, body) => `<table class="table table-striped table-bordered">
<thead>
${header}</thead>
<tbody>
${body}</tbody>
</table>
`;
renderer.image = (href, title, text) =>
	`<img src="${href}" alt="${text}" class="img-responsive">`;

marked.setOptions({
	renderer,
	gfm        : true,
	tables     : true,
	breaks     : false,
	pedantic   : false,
	sanitize   : false,
	smartLists : true,
	smartypants: false,
});

class SingleBlueprint extends PureComponent
{
	static propTypes = forbidExtraProps({
		id                        : PropTypes.string.isRequired,
		my                        : myPropTypes,
		displayName               : PropTypes.string,
		displayNameLoading        : PropTypes.bool.isRequired,
		subscribeToBlueprint      : PropTypes.func.isRequired,
		subscribeToUserDisplayName: PropTypes.func.isRequired,
		// TODO: Only bother if we're logged in
		loading                   : PropTypes.bool.isRequired,
		user                      : propTypes.userSchema,
		blueprint                 : BlueprintProjection,
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

	state = {
		showBlueprint: false,
		showJson     : false,
		showConverted: false,
	};

	UNSAFE_componentWillMount()
	{
		this.props.subscribeToBlueprint(this.props.id);
		this.cacheBlueprintState(this.props);
	}

	componentDidMount()
	{
		window.scrollTo(0, 0);
	}

	UNSAFE_componentWillReceiveProps(nextProps)
	{
		if (!isEqual(this.props.blueprint, nextProps.blueprint))
		{
			this.cacheBlueprintState(nextProps);
		}
	}

	cacheBlueprintState = (props) =>
	{
		if (isEmpty(props.blueprint))
		{
			this.setState({
				thumbnail         : undefined,
				renderedMarkdown  : undefined,
				parsedBlueprint   : undefined,
				ownedByCurrentUser: undefined,
				v15Decoded        : undefined,
			});
			return;
		}

		const {imgurImage, descriptionMarkdown, blueprintString, author: {userId}} = props.blueprint;
		// Blueprint author
		this.props.subscribeToUserDisplayName(userId);

		const thumbnail          = buildImageUrl(imgurImage.imgurId, imgurImage.imgurType, 'l');
		const renderedMarkdown   = marked(descriptionMarkdown);
		const ownedByCurrentUser = props.user && props.user.uid === userId;
		const parsedBlueprint    = this.parseBlueprint(blueprintString.blueprintString);
		const v15Decoded         = parsedBlueprint && parsedBlueprint.getV15Decoded();

		this.setState({
			thumbnail,
			renderedMarkdown,
			parsedBlueprint,
			ownedByCurrentUser,
			v15Decoded,
		});
	};

	hideButton = text => (
		<>
			<FontAwesomeIcon icon={faToggleOn} size='lg' fixedWidth className='text-success' />
			{` ${text}`}
		</>
	);

	showButton = text => (
		<>
			<FontAwesomeIcon icon={faToggleOff} size='lg' fixedWidth />
			{` ${text}`}
		</>
	);

	handleShowHideBase64 = (event) =>
	{
		this.setState({showBlueprint: !this.state.showBlueprint});
	};

	handleShowHideJson = (event) =>
	{
		this.setState({showJson: !this.state.showJson});
	};

	handleShowHideConverted = (event) =>
	{
		this.setState({showConverted: !this.state.showConverted});
	};

	parseBlueprint = (blueprintString) =>
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
	};

	entityHistogram = parsedBlueprint =>
		flow(
			countBy('name'),
			toPairs,
			sortBy(1),
			reverse,
		)(concat(parsedBlueprint.entities || [], parsedBlueprint.tiles || []));

	getAuthorName = () =>
	{
		const {displayNameLoading, displayName} = this.props;
		if (displayNameLoading)
		{
			return 'Author name loading';
		}
		if (displayName)
		{
			return displayName;
		}
		return '(Anonymous)';
	};

	itemHistogram = (parsedBlueprint) =>
	{
		const result = {};
		const items  = flatMap(parsedBlueprint.entities, entity => entity.items || []);
		items.forEach((item) =>
		{
			if (has(item, 'item') && has(item, 'count'))
			{
				result[item.item] = (result[item.item] || 0) + item.count;
			}
			else
			{
				forOwn(item, (value, key) => result[key] = (result[key] || 0) + value);
			}
		});

		return flow(
			toPairs,
			sortBy(1),
			reverse,
		)(result);
	};

	renderFavoriteButton = () =>
	{
		const myFavorite = includes(this.props.my.favorites.data, this.props.id);
		const heart      = myFavorite ? faHeart : regularHeart;
		const iconClass  = myFavorite ? 'text-warning' : 'text-default';

		return (
			<Button size='lg' disabled>
				<FontAwesomeIcon icon={heart} className={iconClass} />
				{' Favorite'}
			</Button>
		);
	};

	render()
	{
		const {blueprint} = this.props;

		if (isEmpty(blueprint))
		{
			if (this.props.loading === true || this.props.loading === undefined)
			{
				return (
					<DocumentTitle title='Factorio Prints: Loading Data'>
						<Jumbotron>
							<h1 className='display-4'>
								<FontAwesomeIcon icon={faCog} spin />
								{' Loading data'}
							</h1>
						</Jumbotron>
					</DocumentTitle>
				);
			}

			return <NoMatch />;
		}

		const {imgurImage, createdOn, systemFrom, author: {userId: authorId}, title, numberOfUpvotes} = blueprint;

		const titleLink = (
			<a
				className='mr-1'
				target='_blank'
				rel='noopener noreferrer'
				href={`https://factorioprints.com/view/${this.props.id}`}
			>
				<h1>
					<FontAwesomeIcon icon={faLink} className='text-warning' />
					{` ${title}`}
				</h1>
			</a>
		);

		return (
			<DocumentTitle title={`Factorio Prints: ${title}`}>
				<Container>
					<Row>
						<Col md={9}>
							<div className='d-flex mt-4'>
								{titleLink}
							</div>
						</Col>
						<Col md={3} className='d-flex align-items-center justify-content-end'>
							{/*	{(this.state.ownedByCurrentUser || this.props.isModerator) && this.renderEditButton()}*/}
							{/*	{!this.state.ownedByCurrentUser && this.renderFavoriteButton()}*/}
							{this.renderFavoriteButton()}
						</Col>
					</Row>
					<Row>
						<Col md={4}>
							<a
								href={`http://imgur.com/${imgurImage.imgurId}`}
								target='_blank'
								rel='noopener noreferrer'
							>
								<Image
									thumbnail
									className='border-warning'
									src={this.state.thumbnail}
									referrerPolicy='no-referrer'
								/>
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
													<Link
														key={`${tag.tag.category}/${tag.tag.name}`}
														to={`/tagged/${tag.tag.category}/${tag.tag.name}/`}
														className='m-1'
													>
														<Badge variant='warning'>
															{`${tag.tag.category}/${tag.tag.name}`}
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
												<Link to={`user/${authorId}`}>
													{blueprint.author.displayName}
													{
														this.state.ownedByCurrentUser
														&& <span className='pull-right'>
															<b>
																{' (You)'}
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
													title={moment(createdOn).format('dddd, MMMM Do YYYY, h:mm:ss a')}
												>
													{moment(createdOn).fromNow()}
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
													title={moment(systemFrom).format('dddd, MMMM Do YYYY, h:mm:ss a')}
												>
													{moment(systemFrom).fromNow()}
												</span>
											</td>
										</tr>
										<tr>
											<td>
												<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
												{' Favorites'}
											</td>
											<td>
												{numberOfUpvotes}
											</td>
										</tr>
									</tbody>
								</Table>
							</Card>
							{
								this.state.parsedBlueprint && this.state.v15Decoded && this.state.parsedBlueprint.isBlueprint()
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
												this.entityHistogram(this.state.v15Decoded.blueprint).map(pair => (
													<tr key={pair[0]}>
														<td className={`icon icon-${entitiesWithIcons[pair[0]]}`}>
															{
																entitiesWithIcons[pair[0]]
																	? <img
																		src={`/icons/${pair[0]}.png`}
																		alt={pair[0]}
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
												))
											}
											{
												this.itemHistogram(this.state.v15Decoded.blueprint).map(pair => (
													<tr key={pair[0]}>
														<td className={`icon icon-${entitiesWithIcons[pair[0]]}`}>
															{
																entitiesWithIcons[pair[0]]
																	? <img
																		src={`/icons/${pair[0]}.png`}
																		alt={pair[0]}
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
												))
											}
										</tbody>
									</Table>
								</Card>
							}
							{
								this.state.parsedBlueprint && this.state.v15Decoded && this.state.parsedBlueprint.isBlueprint()
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
													{this.state.v15Decoded.blueprint.label}
												</td>
											</tr>
											{
												(this.state.v15Decoded.blueprint.icons || [])
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
																			? <img
																				src={`/icons/${iconName}.png`}
																				alt={iconName}
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
							<GoogleAd />
						</Col>
						<Col md={8}>
							<Card>
								<Card.Header>
									Details
								</Card.Header>
								<Card.Body>
									<div dangerouslySetInnerHTML={{__html: this.state.renderedMarkdown}} />

									<CopyToClipboard text={blueprint.blueprintString.blueprintString}>
										<Button type='button' variant='warning'>
											<FontAwesomeIcon icon={faClipboard} size='lg' fixedWidth />
											{' Copy to Clipboard'}
										</Button>
									</CopyToClipboard>
									<Button type='button' onClick={this.handleShowHideBase64}>
										{
											this.state.showBlueprint
												? this.hideButton('Hide Blueprint')
												: this.showButton('Show Blueprint')
										}
									</Button>
									<Button type='button' onClick={this.handleShowHideJson}>
										{
											this.state.showJson
												? this.hideButton('Hide Json')
												: this.showButton('Show Json')
										}
									</Button>
									{
										this.state.parsedBlueprint && this.state.parsedBlueprint.isV14()
										&& <Button type='button' onClick={this.handleShowHideConverted}>
											{
												this.state.showConverted
													? this.hideButton('Hide 0.15 blueprint')
													: this.showButton('Convert to 0.15 blueprint')
											}
										</Button>
									}

								</Card.Body>
							</Card>
							{
								this.state.showBlueprint && <Card>
									<Card.Header>
										Blueprint String
									</Card.Header>
									<Card.Body>
										<div className='blueprintString'>
											{blueprint.blueprintString.blueprintString}
										</div>
									</Card.Body>
								</Card>
							}
							{
								this.state.showJson && <Card>
									<Card.Header>
										Json Representation
									</Card.Header>
									<Card.Body className='code'>
										{JSON.stringify(this.state.v15Decoded, null, 4)}
									</Card.Body>
								</Card>
							}
							{
								this.state.showConverted && <Card>
									<Card.Header>
										0.15 format Blueprint String (Experimental)
									</Card.Header>
									<div className='blueprintString'>
										{encodeV15ToBase64(JSON.stringify(this.state.v15Decoded))}
									</div>
								</Card>
							}
							{
								this.state.parsedBlueprint && this.state.v15Decoded && this.state.parsedBlueprint.isBook()
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
													{this.state.v15Decoded.blueprint_book.label}
												</td>
											</tr>
											{
												this.state.v15Decoded.blueprint_book.blueprints.map((eachBlueprint, blueprintIndex) => (
													<tr key={blueprintIndex}>
														{
															range(4).map((iconIndex) =>
															{
																if (eachBlueprint.blueprint.icons
																	&& eachBlueprint.blueprint.icons.length > iconIndex
																	&& eachBlueprint.blueprint.icons[iconIndex] !== null)
																{
																	const icon = eachBlueprint.blueprint.icons[iconIndex];
																	// eslint-disable-next-line
																	const iconName = icon.name || icon.signal && icon.signal.name;
																	return (
																		<td
																			className={`icon icon-${iconName}`}
																			key={iconIndex}
																		>
																			{
																				entitiesWithIcons[iconName]
																					? <img
																						src={`/icons/${iconName}.png`}
																						alt={iconName}
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
								this.state.parsedBlueprint && this.state.v15Decoded && this.state.parsedBlueprint.isUpgradePlanner()
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
												this.state.v15Decoded.upgrade_planner.settings.mappers.map(({from, to, index}) => (
													<tr key={index}>
														<td className={`icon icon-${from.name}`}>
															{
																entitiesWithIcons[from.name]
																	? <img
																		src={`/icons/${from.name}.png`}
																		alt={from.name}
																	/>
																	: ''
															}
														</td>
														<td className={`icon icon-${to.name}`}>
															{
																entitiesWithIcons[to.name]
																	? <img
																		src={`/icons/${to.name}.png`}
																		alt={to.name}
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
					{/*<Row className='w-100'>*/}
					{/*	<Disqus.DiscussionEmbed*/}
					{/*		shortname='factorio-blueprints'*/}
					{/*		config={disqusConfig}*/}
					{/*		className='w-100'*/}
					{/*	/>*/}
					{/*</Row>*/}
				</Container>
			</DocumentTitle>
		);
	}
}

const mapStateToProps = (storeState, ownProps) =>
{
	const id        = ownProps.match.params.blueprintId;
	const blueprint = selectors.getBlueprintDataById(storeState, {id});

	return {
		id,
		my                : storeState.my,
		user              : selectors.getFilteredUser(storeState),
		isModerator       : selectors.getIsModerator(storeState),
		blueprint         : selectors.getBlueprintDataById(storeState, {id}),
		loading           : selectors.getBlueprintLoadingById(storeState, {id}),
		displayName       : selectors.getUserDisplayName(storeState, {id: get(blueprint, ['author', 'userId'])}),
		displayNameLoading: selectors.getUserDisplayNameLoading(storeState, {id}),
	};
};

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {
		subscribeToBlueprint,
		subscribeToUserDisplayName,
	};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(SingleBlueprint);

