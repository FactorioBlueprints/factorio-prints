/* eslint-disable react/no-array-index-key */

import {forbidExtraProps} from 'airbnb-prop-types';
import concat from 'lodash/concat';
import flatMap from 'lodash/flatMap';
import forOwn from 'lodash/forOwn';
import countBy from 'lodash/fp/countBy';
import flow from 'lodash/fp/flow';
import reverse from 'lodash/fp/reverse';
import sortBy from 'lodash/fp/sortBy';
import toPairs from 'lodash/fp/toPairs';
import get from 'lodash/get';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import range from 'lodash/range';

import marked from 'marked';
import moment from 'moment';

import PropTypes from 'prop-types';

import React, {PureComponent} from 'react';

import Button from 'react-bootstrap/lib/Button';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import Col from 'react-bootstrap/lib/Col';
import Grid from 'react-bootstrap/lib/Grid';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import Label from 'react-bootstrap/lib/Label';
import Panel from 'react-bootstrap/lib/Panel';
import Row from 'react-bootstrap/lib/Row';
import Table from 'react-bootstrap/lib/Table';
import Thumbnail from 'react-bootstrap/lib/Thumbnail';

import CopyToClipboard from 'react-copy-to-clipboard';
import ReactDisqusThread from 'react-disqus-thread';

import DocumentTitle from 'react-document-title';
import FontAwesome from 'react-fontawesome';
import {connect} from 'react-redux';
import {Link} from 'react-router-dom';
import {bindActionCreators} from 'redux';

import {subscribeToBlueprint, subscribeToModerators, subscribeToUserDisplayName} from '../actions/actionCreators';

import {app} from '../base';
import Blueprint from '../Blueprint';

import entitiesWithIcons from '../data/entitiesWithIcons';
import buildImageUrl from '../helpers/buildImageUrl';

import {encodeV15ToBase64} from '../parser/decodeFromBase64';

import {blueprintSchema, historySchema, locationSchema, userSchema} from '../propTypes';

import * as selectors from '../selectors';
import NoMatch from './NoMatch';
import Title from './Title';

const renderer = new marked.Renderer();
renderer.table = (header, body) => `<table class="table table-striped table-bordered">
<thead>
${header}</thead>
<tbody>
${body}</tbody>
</table>
`;

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
		displayName               : PropTypes.string,
		displayNameLoading        : PropTypes.bool.isRequired,
		subscribeToBlueprint      : PropTypes.func.isRequired,
		subscribeToUserDisplayName: PropTypes.func.isRequired,
		// TODO: Only bother if we're logged in
		subscribeToModerators     : PropTypes.func.isRequired,
		loading                   : PropTypes.bool.isRequired,
		myFavorites               : PropTypes.objectOf(PropTypes.bool.isRequired),
		user                      : userSchema,
		blueprint                 : blueprintSchema,
		isModerator               : PropTypes.bool.isRequired,
		location                  : locationSchema,
		history                   : historySchema,
		staticContext             : PropTypes.shape(forbidExtraProps({})),
		match                     : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({
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

	componentWillMount()
	{
		this.props.subscribeToBlueprint(this.props.id);
		if (!isEmpty(this.props.user))
		{
			this.props.subscribeToModerators();
		}
		this.cacheState(this.props);
	}

	componentDidMount()
	{
		window.scrollTo(0, 0);
	}

	componentWillReceiveProps(nextProps)
	{
		if (!isEqual(this.props.blueprint, nextProps.blueprint))
		{
			this.cacheState(nextProps);
		}

		if (!isEqual(this.props.user, nextProps.user) && !isEmpty(nextProps.user))
		{
			nextProps.subscribeToModerators();
		}
	}

	cacheState = (props) =>
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

		const {image, descriptionMarkdown, blueprintString, author: {userId: authorId}} = props.blueprint;
		// Blueprint author
		this.props.subscribeToUserDisplayName(authorId);

		const thumbnail          = buildImageUrl(image.id, image.type, 'l');
		const renderedMarkdown   = marked(descriptionMarkdown);
		const ownedByCurrentUser = props.user && props.user.uid === authorId;
		const parsedBlueprint    = this.parseBlueprint(blueprintString);
		const v15Decoded         = parsedBlueprint && parsedBlueprint.getV15Decoded();

		this.setState({thumbnail, renderedMarkdown, parsedBlueprint, ownedByCurrentUser, v15Decoded});
	};

	handleFavorite = () =>
	{
		const {uid}                = this.props.user;
		const {numberOfFavorites}  = this.props.blueprint;
		const wasFavorite          = this.props.myFavorites[this.props.id];
		const newNumberOfFavorites = numberOfFavorites + (wasFavorite ? -1 : 1);

		const updates = {
			[`/blueprints/${this.props.id}/numberOfFavorites`]        : newNumberOfFavorites,
			[`/blueprints/${this.props.id}/favorites/${uid}`]         : wasFavorite ? null : true,
			[`/blueprintSummaries/${this.props.id}/numberOfFavorites`]: newNumberOfFavorites,
			[`/users/${uid}/favorites/${this.props.id}`]              : wasFavorite ? null : true,
		};
		app.database().ref().update(updates);
	};

	handleShowHideBase64 = (event) =>
	{
		event.preventDefault();
		this.setState({showBlueprint: !this.state.showBlueprint});
	};

	handleShowHideJson = (event) =>
	{
		event.preventDefault();
		this.setState({showJson: !this.state.showJson});
	};

	handleShowHideConverted = (event) =>
	{
		event.preventDefault();
		this.setState({showConverted: !this.state.showConverted});
	};

	handleTransitionToEdit = () =>
	{
		this.props.history.push(`/edit/${this.props.id}`);
	};

	parseBlueprint = (blueprintString) =>
	{
		try
		{
			return new Blueprint(blueprintString);
		}
		catch (ignored)
		{
			console.log(ignored);
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

	renderEditButton = () => (
		<Button
			bsSize='large'
			className='pull-right'
			onClick={this.handleTransitionToEdit}
		>
			<FontAwesome name='edit' />
			{' Edit'}
		</Button>
	);

	renderFavoriteButton = () =>
	{
		const {user} = this.props;

		if (!user)
		{
			return <div />;
		}

		const myFavorite  = this.props.myFavorites[this.props.id];
		const iconName    = myFavorite ? 'heart' : 'heart-o';
		const iconClass   = myFavorite ? 'text-primary' : 'text-default';

		return (
			<Button bsSize='large' className='pull-right' onClick={this.handleFavorite}>
				<FontAwesome name={iconName} className={iconClass} />
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
							<h1>
								<FontAwesome name='cog' spin />
								{' Loading data'}
							</h1>
						</Jumbotron>
					</DocumentTitle>
				);
			}

			return <NoMatch />;
		}

		const {image, createdDate, lastUpdatedDate, author: {userId: authorId}, title, numberOfFavorites} = blueprint;

		return (
			<DocumentTitle title={`Factorio Prints: ${title}`}>
				<Grid>
					<div className='page-header'>
						<div className='btn-toolbar pull-right'>
							{!this.state.ownedByCurrentUser && this.renderFavoriteButton()}
							{(this.state.ownedByCurrentUser || this.props.isModerator) && this.renderEditButton()}
						</div>
						<h1>{title}</h1>
					</div>
					<Row>
						<Col md={4}>
							<Thumbnail
								href={`https://imgur.com/${image.id}`}
								src={this.state.thumbnail}
								target='_blank'
							/>
							{
								blueprint.tags && blueprint.tags.length > 0 && <Panel header='Tags'>
									<h4>
										{
											flatMap(blueprint.tags || [], tag => [
												<Link key={tag} to={`/tagged${tag}`}>
													<Label bsStyle='primary'>
														{tag}
													</Label>
												</Link>,
												' ',
											])
										}
									</h4>
								</Panel>
							}
							<Panel header='Info'>
								<Table bordered hover fill>
									<tbody>
										<tr>
											<td><FontAwesome name='user' size='lg' fixedWidth />{' Author'}</td>
											<td>
												<Link to={`/user/${authorId}`}>
													{this.props.displayNameLoading && 'Author name loading' || this.props.displayName || '(Anonymous)'}
													{
														this.state.ownedByCurrentUser &&
														<span className='pull-right'>
															<b>{'(You)'}</b>
														</span>
													}
												</Link>
											</td>
										</tr>
										<tr>
											<td>
												<FontAwesome name='calendar' size='lg' fixedWidth />
												{' Created'}</td>
											<td>
												<span
													title={moment(createdDate).format('dddd, MMMM Do YYYY, h:mm:ss a')}>
													{moment(createdDate).fromNow()}
												</span>
											</td>
										</tr>
										<tr>
											<td>
												<FontAwesome name='clock-o' size='lg' fixedWidth />
												{' Last Updated'}
											</td>
											<td>
												<span
													title={moment(lastUpdatedDate).format('dddd, MMMM Do YYYY, h:mm:ss a')}>
													{moment(lastUpdatedDate).fromNow()}
												</span>
											</td>
										</tr>
										<tr>
											<td><FontAwesome name='heart' size='lg' fixedWidth />{' Favorites'}</td>
											<td>{numberOfFavorites}</td>
										</tr>
									</tbody>
								</Table>
							</Panel>
							{
								this.state.parsedBlueprint && this.state.v15Decoded && !this.state.parsedBlueprint.isBook() &&
								<Panel header='Requirements'>
									<Table bordered hover fill>
										<colgroup>
											<col span='1' style={{width: '1%'}} />
											<col span='1' style={{width: '1%'}} />
											<col span='1' />
										</colgroup>

										<tbody>
											{
												this.entityHistogram(this.state.v15Decoded.blueprint).map(pair => (
													<tr key={pair[0]}>
														<td className='icon'>
															{
																entitiesWithIcons[pair[0]]
																	?
																	<img src={`/icons/${pair[0]}.png`} alt={pair[0]} />
																	: ''
															}
														</td>
														<td className='number'>{pair[1]}</td>
														<td>{pair[0]}</td>
													</tr>
												))
											}
											{
												this.itemHistogram(this.state.v15Decoded.blueprint).map(pair => (
													<tr key={pair[0]}>
														<td className='icon'>
															{
																entitiesWithIcons[pair[0]]
																	?
																	<img src={`/icons/${pair[0]}.png`} alt={pair[0]} />
																	: ''
															}
														</td>
														<td className='number'>{pair[1]}</td>
														<td>{pair[0]}</td>
													</tr>
												))
											}
										</tbody>
									</Table>
								</Panel>
							}
							{
								this.state.parsedBlueprint && this.state.v15Decoded && !this.state.parsedBlueprint.isBook() &&
								<Panel header='Extra Info'>
									<Table bordered hover fill>
										<colgroup>
											<col span='1' style={{width: '1%'}} />
											<col span='1' />
										</colgroup>

										<tbody>
											<tr>
												<td colSpan={2}>{this.state.v15Decoded.blueprint.label}</td>
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
																<td className='icon'>{entitiesWithIcons[iconName] ?
																	<img src={`/icons/${iconName}.png`}
																		 alt={iconName} /> : ''}</td>
																<td>{iconName}</td>
															</tr>
														);
													})
											}
										</tbody>
									</Table>
								</Panel>
							}
						</Col>
						<Col md={8}>
							<Panel header='Details'>
								<div dangerouslySetInnerHTML={{__html: this.state.renderedMarkdown}} />
							</Panel>
							<Panel>
								<ButtonToolbar>
									<CopyToClipboard text={blueprint.blueprintString}>
										<Button bsStyle='primary'>
											<Title icon='clipboard' text='Copy to Clipboard' />
										</Button>
									</CopyToClipboard>
									<Button onClick={this.handleShowHideBase64}>
										{
											this.state.showBlueprint
												? <Title icon='toggle-on' text='Hide Blueprint'
														 className='text-success' />
												: <Title icon='toggle-off' text='Show Blueprint' />
										}
									</Button>
									<Button onClick={this.handleShowHideJson}>
										{
											this.state.showJson
												? <Title icon='toggle-on' text='Hide Json' className='text-success' />
												: <Title icon='toggle-off' text='Show Json' />
										}
									</Button>
									{
										this.state.parsedBlueprint && this.state.parsedBlueprint.isV14()
										&& <Button onClick={this.handleShowHideConverted}>
											{
												this.state.showConverted
													? <Title icon='toggle-on' text='Hide 0.15 blueprint'
															 className='text-success' />
													: <Title icon='toggle-off' text='Convert to 0.15 blueprint' />
											}
										</Button>
									}
								</ButtonToolbar>
							</Panel>
							{
								this.state.parsedBlueprint && this.state.v15Decoded && this.state.parsedBlueprint.isBook() &&
								<Panel header='Extra Info'>
									<Table bordered hover fill>
										<colgroup>
											<col span='1' style={{width: '1%'}} />
											<col span='1' style={{width: '1%'}} />
											<col span='1' style={{width: '1%'}} />
											<col span='1' style={{width: '1%'}} />
											<col span='1' />
										</colgroup>
										<tbody>
											<tr>
												<td colSpan={4}>{'Book'}</td>
												<td>{this.state.v15Decoded.blueprint_book.label}</td>
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
																	const icon     = eachBlueprint.blueprint.icons[iconIndex];
																	// eslint-disable-next-line
																	const iconName = icon.name || icon.signal && icon.signal.name;
																	return <td className='icon'
																			   key={iconIndex}>{entitiesWithIcons[iconName] ?
																		<img src={`/icons/${iconName}.png`}
																			 alt={iconName} /> : ''}</td>;
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
								</Panel>
							}
							{
								this.state.showBlueprint && <Panel header='Blueprint String'>
									<div className='blueprintString'>
										{blueprint.blueprintString}
									</div>
								</Panel>
							}
							{
								this.state.showJson && <Panel header='Json Representation'>
									<div className='json'>
										{JSON.stringify(this.state.v15Decoded, null, 4)}
									</div>
								</Panel>
							}
							{
								this.state.showConverted && <Panel header='0.15 format Blueprint String (Experimental)'>
									<div className='blueprintString'>
										{encodeV15ToBase64(JSON.stringify(this.state.v15Decoded))}
									</div>
								</Panel>
							}
						</Col>
					</Row>
					<Row>
						<ReactDisqusThread
							shortname='factorio-blueprints'
							identifier={this.props.id}
							title={blueprint.title}
						/>
					</Row>
				</Grid>
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
		user              : selectors.getFilteredUser(storeState),
		isModerator       : selectors.getIsModerator(storeState),
		blueprint         : selectors.getBlueprintDataById(storeState, {id}),
		loading           : selectors.getBlueprintLoadingById(storeState, {id}),
		myFavorites       : selectors.getMyFavorites(storeState),
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

export default connect(mapStateToProps, mapDispatchToProps)(SingleBlueprint);

