/* eslint-disable react/no-array-index-key */

import {
	faCalendar,
	faClock,
	faCodeBranch,
	faCog,
	faHeart,
	faLink,
	faToggleOff,
	faToggleOn,
	faUser,
}                             from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import flatMap                from 'lodash/flatMap';
import get                    from 'lodash/get';
import isEmpty                from 'lodash/isEmpty';
import isEqual                from 'lodash/isEqual';
import marked                 from 'marked';
import moment                 from 'moment';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Badge                  from 'react-bootstrap/Badge';
import Button                 from 'react-bootstrap/Button';
import Card                   from 'react-bootstrap/Card';
import Col                    from 'react-bootstrap/Col';
import Container              from 'react-bootstrap/Container';
import Image                  from 'react-bootstrap/Image';
import Jumbotron              from 'react-bootstrap/Jumbotron';
import Row                    from 'react-bootstrap/Row';
import Table                  from 'react-bootstrap/Table';
import DocumentTitle          from 'react-document-title';
import {connect}              from 'react-redux';
import {Link}                 from 'react-router-dom';
import {bindActionCreators}   from 'redux';

import {subscribeToBlueprint, subscribeToUserDisplayName} from '../actions/actionCreators';
import buildImageUrl                                      from '../helpers/buildImageUrl';

import * as propTypes      from '../propTypes';
import BlueprintProjection from '../propTypes/BlueprintProjection';
import myPropTypes         from '../propTypes/myPropTypes';
import * as selectors      from '../selectors';

import GoogleAd                  from './GoogleAd';
import NoMatch                   from './NoMatch';
import BlueprintInfoPanel        from './single/BlueprintInfoPanel';
import BlueprintMarkdown         from './single/BlueprintMarkdown';
import BlueprintStringCard       from './single/BlueprintStringCard';
import BlueprintTitle            from './single/BlueprintTitle';
import BlueprintTitles           from './single/BlueprintTitles';
import BlueprintVersion          from './single/BlueprintVersion';
import CopyBlueprintStringButton from './single/CopyBlueprintButton';
import FavoriteButton            from './single/FavoriteButton';
import FbeLink                   from './single/FbeLink';
import ImgurThumbnail            from './single/ImgurThumbnail';
import RequirementsHistogram     from './single/RequirementsHistogram';
import TagsPanel                 from './single/TagsPanel';

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
				ownedByCurrentUser: undefined,
			});
			return;
		}

		const {author: {userId}} = props.blueprint;
		// Blueprint author
		this.props.subscribeToUserDisplayName(userId);

		const ownedByCurrentUser = props.user && props.user.uid === userId;

		this.setState({
			ownedByCurrentUser,
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

		const {title} = blueprint;

		// Remove null tags
		blueprint.tags = blueprint.tags.filter(tag => tag.tag !== null)

		return (
			<Container>
				<Row>
					<Col md={9}>
						<div className='d-flex mt-4'>
							<BlueprintTitle blueprintKey={this.props.id} />
						</div>
					</Col>
					<Col md={3} className='d-flex align-items-center justify-content-end'>
						{/*	{(this.state.ownedByCurrentUser || this.props.isModerator) && this.renderEditButton()}*/}
						{!this.state.ownedByCurrentUser && <FavoriteButton blueprintKey={this.props.id} />}
					</Col>
				</Row>
				<Row>
					<Col md={4}>
						<ImgurThumbnail blueprintKey={this.props.id} />
						<TagsPanel blueprintKey={this.props.id} />
						<BlueprintInfoPanel blueprintKey={this.props.id} ownedByCurrentUser={this.state.ownedByCurrentUser} />
						<RequirementsHistogram blueprintKey={this.props.id} />
						<GoogleAd />
					</Col>
					<Col md={8}>
						<Card>
							<Card.Header>
								Details
							</Card.Header>
							<Card.Body>
								<BlueprintMarkdown blueprintKey={this.props.id} />
								<CopyBlueprintStringButton blueprintKey={this.props.id} />
								<Button type='button' onClick={this.handleShowHideBase64}>
									{
										this.state.showBlueprint
											? this.hideButton('Hide Blueprint')
											: this.showButton('Show Blueprint')
									}
								</Button>
								<FbeLink blueprintKey={this.props.id} />
							</Card.Body>
						</Card>
						{
							this.state.showBlueprint && <BlueprintStringCard blueprintKey={this.props.id} />
						}
						<Card>
							<Card.Header>
								Blueprint Titles
							</Card.Header>
							<Card.Body>
								<BlueprintTitles blueprintKey={this.props.id} />
							</Card.Body>
						</Card>
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

