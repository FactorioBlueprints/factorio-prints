import React, {Component, PropTypes} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import Col from 'react-bootstrap/lib/Col';
import Thumbnail from 'react-bootstrap/lib/Thumbnail';
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
import Panel from 'react-bootstrap/lib/Panel';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Button from 'react-bootstrap/lib/Button';
import Table from 'react-bootstrap/lib/Table';
import {Link} from 'react-router';
import ReactDisqusThread from 'react-disqus-thread';
// import ClipboardButton from 'react-clipboard';
import noImageAvailable from '../gif/No_available_image.gif';
import NoMatch from './NoMatch';
import marked from 'marked';
import moment from 'moment';
import base from '../base';

class SingleBlueprint extends Component {
	static propTypes = {
		id         : PropTypes.string.isRequired,
		blueprint  : PropTypes.shape({
			title              : PropTypes.string.isRequired,
			imageUrl           : PropTypes.string,
			thumbnail          : PropTypes.string,
			author             : PropTypes.shape({
				displayName: PropTypes.string.isRequired,
				userId     : PropTypes.string.isRequired,
			}).isRequired,
			createdDate        : PropTypes.number.isRequired,
			lastUpdatedDate    : PropTypes.number.isRequired,
			numberOfFavorites  : PropTypes.number.isRequired,
			favorites          : PropTypes.object,
			blueprintString    : PropTypes.string.isRequired,
			descriptionMarkdown: PropTypes.string.isRequired,
		}),
		user       : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string.isRequired,
		}),
		isModerator: PropTypes.bool,
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	handleFavorite = () =>
	{
		const blueprint            = this.props.blueprint;
		const favorites            = blueprint.favorites;
		const userId               = this.props.user.userId;
		const wasFavorite          = favorites && favorites[userId];
		const numberOfFavorites    = blueprint.numberOfFavorites;
		const newNumberOfFavorites = numberOfFavorites + (wasFavorite ? -1 : 1);

		base.database().ref(`/blueprints/${this.props.id}/favorites/${userId}`).set(!wasFavorite);
		base.database().ref(`/blueprints/${this.props.id}/numberOfFavorites`).set(newNumberOfFavorites);
		base.database().ref(`/users/${userId}/favorites/${this.props.id}`).set(!wasFavorite);
	};

	renderFavoriteButton = () =>
	{
		const user = this.props.user;

		if (!user)
		{
			return <div />;
		}

		const favorites  = this.props.blueprint.favorites;
		const myFavorite = favorites && user && favorites[user.userId];
		const glyphName  = myFavorite ? 'heart' : 'heart-empty';

		return (
			<Button bsSize='large' className='pull-right' onClick={this.handleFavorite}>
				<Glyphicon glyph={glyphName} />{' Favorite'}
			</Button>
		);
	};

	renderEditButton = () =>
		<Button
			bsSize='large'
			className='pull-right'
			onClick={() => this.context.router.transitionTo(`/edit/${this.props.id}`)}>
			{'Edit'}
		</Button>;

	render()
	{
		if (!this.props.blueprint)
		{
			return <NoMatch />;
		}

		const thumbnail = this.props.blueprint.thumbnail || this.props.blueprint.imageUrl || noImageAvailable;

		const renderedMarkdown = marked(this.props.blueprint.descriptionMarkdown);
		const createdDate      = this.props.blueprint.createdDate;
		const lastUpdatedDate  = this.props.blueprint.lastUpdatedDate;

		const ownedByCurrentUser = this.props.user && this.props.user.userId === this.props.blueprint.author.userId;

		return <Grid>
			<Row>
				<PageHeader>
					{this.props.blueprint.title}
					{!ownedByCurrentUser && this.renderFavoriteButton()}
					{(ownedByCurrentUser || this.props.isModerator) && this.renderEditButton()}
				</PageHeader>
			</Row>
			<Row>
				<Col md={4}>
					<Thumbnail
						href={this.props.blueprint.imageUrl || noImageAvailable}
						src={thumbnail}
						target='_blank'
					/>
					<Panel header='Info'>
						<Table bordered hover fill>
							<tbody>
								<tr>
									<td>{'Author'}</td>
									<td>
										<Link to={`/user/${this.props.blueprint.author.userId}`}>
											{this.props.blueprint.author.displayName}
											{ownedByCurrentUser && <span className='pull-right'><b>{'(You)'}</b></span>}
										</Link>
									</td>
								</tr>
								<tr>
									<td>{'Created'}</td>
									<td>
										<span title={moment(createdDate).format('dddd, MMMM Do YYYY, h:mm:ss a')}>{moment(createdDate).fromNow()}</span>
									</td>
								</tr>
								<tr>
									<td>{'Last Updated'}</td>
									<td>
										<span title={moment(lastUpdatedDate).format('dddd, MMMM Do YYYY, h:mm:ss a')}>{moment(lastUpdatedDate).fromNow()}</span>
									</td>
								</tr>
								<tr>
									<td><Glyphicon glyph='heart-empty' />{' Favorites'}</td>
									<td>{this.props.blueprint.numberOfFavorites}</td>
								</tr>
							</tbody>
						</Table>
					</Panel>
				</Col>
				<Col md={8}>
					<Panel header='Details'>
						<div dangerouslySetInnerHTML={{__html: renderedMarkdown}} />
					</Panel>

					<Panel header='Blueprint String'>
						{/* <ClipboardButton data-clipboard-target='#blueprintString' className='btn btn-default'> */}
						{/* <Glyphicon glyph='copy' />{' Copy to Clipboard'} */}
						{/* </ClipboardButton> */}
						<div className='blueprintString' id='blueprintString'>
							{this.props.blueprint.blueprintString}
						</div>
					</Panel>
				</Col>
			</Row>
			<Row>
				<ReactDisqusThread
					shortname='factorio-blueprints'
					identifier={this.props.id}
					title={this.props.blueprint.title}
				/>
			</Row>
		</Grid>;
	}
}

export default SingleBlueprint;
