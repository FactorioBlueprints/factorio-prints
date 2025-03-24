import {faArrowLeft, faBan, faCog, faSave, faTrash} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}                            from '@fortawesome/react-fontawesome';

import {forbidExtraProps}     from 'airbnb-prop-types';
import firebase               from 'firebase/app';
import update                 from 'immutability-helper';
import difference             from 'lodash/difference';
import forEach                from 'lodash/forEach';
import isEmpty                from 'lodash/isEmpty';
import isEqual                from 'lodash/isEqual';
import some                   from 'lodash/some';
import {marked}               from 'marked';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Alert                  from 'react-bootstrap/Alert';
import Button                 from 'react-bootstrap/Button';
import ButtonToolbar          from 'react-bootstrap/ButtonToolbar';
import Card                   from 'react-bootstrap/Card';
import Col                    from 'react-bootstrap/Col';
import Container              from 'react-bootstrap/Container';
import Form                   from 'react-bootstrap/Form';
import FormControl            from 'react-bootstrap/FormControl';
import Modal                  from 'react-bootstrap/Modal';
import ProgressBar            from 'react-bootstrap/ProgressBar';
import Row                    from 'react-bootstrap/Row';
import {connect}              from 'react-redux';
import {useParams, useLocation, useNavigate} from 'react-router-dom';
import Select                 from 'react-select';
import {bindActionCreators}   from 'redux';

import {subscribeToBlueprint, subscribeToModerators, subscribeToTags} from '../actions/actionCreators';

import {app}                  from '../base';
import Blueprint              from '../Blueprint';
import noImageAvailable       from '../gif/No_available_image.gif';
import buildImageUrl          from '../helpers/buildImageUrl';
import generateTagSuggestions from '../helpers/generateTagSuggestions';
import * as propTypes         from '../propTypes';
import * as selectors         from '../selectors';

import NoMatch             from './NoMatch';
import PageHeader          from './PageHeader';
import TagSuggestionButton from './TagSuggestionButton';

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

class EditBlueprint extends PureComponent
{
	static propTypes = forbidExtraProps({
		id                   : PropTypes.string.isRequired,
		user                 : propTypes.userSchema,
		subscribeToBlueprint : PropTypes.func.isRequired,
		subscribeToModerators: PropTypes.func.isRequired,
		subscribeToTags      : PropTypes.func.isRequired,
		tags                 : PropTypes.arrayOf(PropTypes.string).isRequired,
		isModerator          : PropTypes.bool.isRequired,
		blueprint            : propTypes.blueprintSchema,
		loading              : PropTypes.bool.isRequired,
		match                : PropTypes.shape(forbidExtraProps({
			params: PropTypes.shape(forbidExtraProps({
				blueprintId: PropTypes.string.isRequired,
			})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})).isRequired,
		location     : propTypes.locationSchema,
		history      : propTypes.historySchema,
		staticContext: PropTypes.shape(forbidExtraProps({})),
	});

	static emptyTags = [];

	static imgurHeaders = {
		'Accept'       : 'application/json',
		'Content-Type' : 'application/json',
		'Authorization': 'Client-ID 46a3f144b6a0882',
	};

	state = {
		renderedMarkdown        : '',
		submissionErrors        : [],
		submissionWarnings      : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		deletionModalVisible    : false,
	};

	UNSAFE_componentWillMount()
	{
		this.props.subscribeToBlueprint(this.props.id);
		this.props.subscribeToTags();
		if (!isEmpty(this.props.user))
		{
			this.props.subscribeToModerators();
		}

		this.cacheBlueprintState(this.props.blueprint);
	}

	UNSAFE_componentWillReceiveProps(nextProps)
	{
		if (!isEqual(this.props.user, nextProps.user) && !isEmpty(nextProps.user))
		{
			nextProps.subscribeToModerators();
		}
		this.cacheBlueprintState(nextProps.blueprint);
	}

	cacheBlueprintState = (blueprint) =>
	{
		if (blueprint)
		{
			const imgurId = blueprint.image && blueprint.image.id;
			const imgurType = blueprint.image && blueprint.image.type;

			const newBlueprint = {
				...blueprint,
				tags    : blueprint.tags || EditBlueprint.emptyTags,
				imageUrl: imgurId ? `https://imgur.com/${imgurId}` : '',
			};

			const renderedMarkdown = marked(blueprint.descriptionMarkdown);
			const parsedBlueprint  = this.parseBlueprint(blueprint.blueprintString);
			const v15Decoded       = parsedBlueprint.getV15Decoded();

			this.setState({
				blueprint: newBlueprint,
				renderedMarkdown,
				parsedBlueprint,
				v15Decoded,
			});
		}
	};

	handleDismissError = () =>
	{
		this.setState({submissionErrors: []});
	};

	handleDismissWarnings = () =>
	{
		this.setState({submissionWarnings: []});
	};

	handleDescriptionChanged = (event) =>
	{
		const descriptionMarkdown = event.target.value;
		console.log('descriptionMarkdown', {event});
		const renderedMarkdown    = marked(descriptionMarkdown);
		this.setState({
			renderedMarkdown,
			blueprint: {
				...this.state.blueprint,
				descriptionMarkdown,
			},
		});
	};

	handleChange = (event) =>
	{
		const {name, value} = event.target;

		const newState = {
			blueprint: {
				...this.state.blueprint,
				[name]: value,
			},
		};

		if (name === 'blueprintString')
		{
			newState.parsedBlueprint = this.parseBlueprint(value);
			newState.v15Decoded      = newState.parsedBlueprint && newState.parsedBlueprint.getV15Decoded();
		}

		this.setState(newState);
	};

	processStatus = (response) =>
	{
		if (response.status === 200 || response.status === 0)
		{
			return Promise.resolve(response);
		}
		return Promise.reject(new Error(response.statusText));
	};

	handleImgurError = (error) =>
	{
		console.error(error.message ? error.message : error);
	};

	handleFirebaseStorageError = (error) =>
	{
		console.error('Image failed to upload.', {error});
		this.setState({
			submissionErrors        : ['Image failed to upload.'],
			uploadProgressBarVisible: false,
		});
	};

	handleUploadProgress = (snapshot) =>
	{
		const uploadProgressPercent = Math.trunc(snapshot.bytesTransferred / snapshot.totalBytes * 100);
		this.setState({uploadProgressPercent});
	};

	validateInputs = () =>
	{
		const submissionErrors = [];
		const {blueprint}      = this.state;
		if (!blueprint.title)
		{
			submissionErrors.push('Title may not be empty');
		}
		else if (blueprint.title.trim().length < 10)
		{
			submissionErrors.push('Title must be at least 10 characters');
		}

		if (!blueprint.descriptionMarkdown)
		{
			submissionErrors.push('Description Markdown may not be empty');
		}
		else if (blueprint.descriptionMarkdown.trim().length < 10)
		{
			submissionErrors.push('Description Markdown must be at least 10 characters');
		}

		if (!blueprint.blueprintString)
		{
			submissionErrors.push('Blueprint String may not be empty');
		}
		else if (blueprint.blueprintString.trim().length < 10)
		{
			submissionErrors.push('Blueprint String must be at least 10 characters');
		}

		const badRegex = /^https:\/\/imgur\.com\/(a|gallery)\/[a-zA-Z0-9]+$/;
		if (badRegex.test(blueprint.imageUrl))
		{
			submissionErrors.push('Please use a direct link to an image like https://imgur.com/{id}. Click on the "Copy Link" button on the Imgur image page.');
		}
		else
		{
			const goodRegex1 = /^https:\/\/i\.imgur\.com\/[a-zA-Z0-9]+\.[a-zA-Z0-9]{3,4}$/;
			const goodRegex2 = /^https:\/\/imgur\.com\/[a-zA-Z0-9]+$/;
			if (!goodRegex1.test(blueprint.imageUrl) && !goodRegex2.test(blueprint.imageUrl))
			{
				submissionErrors.push('Please use a direct link to an image like https://imgur.com/{id} or https://i.imgur.com/{id}.{ext}');
			}
		}

		return submissionErrors;
	};

	someHaveNoName = (blueprintBook) =>
	{
		return some(
			blueprintBook.blueprints,
			(eachEntry) =>
			{
				if (eachEntry.blueprint_book) return this.someHaveNoName(eachEntry.blueprint_book);
				if (eachEntry.blueprint) return isEmpty(eachEntry.blueprint.label);
				return false;
			});
	};

	validateWarnings = () =>
	{
		const submissionWarnings = [];

		if (isEmpty(this.state.blueprint.tags))
		{
			submissionWarnings.push('The blueprint has no tags. Consider adding a few tags.');
		}

		const blueprint = new Blueprint(this.state.blueprint.blueprintString.trim());
		if (isEmpty(blueprint.decodedObject))
		{
			submissionWarnings.push('Could not parse blueprint.');
			return submissionWarnings;
		}

		if (blueprint.isV14())
		{
			submissionWarnings.push('Blueprint is in 0.14 format. Consider upgrading to the latest version.');
		}

		if (blueprint.isBlueprint() && isEmpty(this.state.v15Decoded.blueprint.label))
		{
			submissionWarnings.push('Blueprint has no name. Consider adding a name.');
		}
		if (blueprint.isBlueprint() && isEmpty(this.state.v15Decoded.blueprint.icons))
		{
			submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
		}

		if (blueprint.isBook() && this.someHaveNoName(this.state.v15Decoded.blueprint_book))
		{
			submissionWarnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
		}

		return submissionWarnings;
	};

	handleSaveBlueprintEdits = (event) =>
	{
		event.preventDefault();

		const submissionErrors = this.validateInputs();

		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		const submissionWarnings = this.validateWarnings();
		if (submissionWarnings.length > 0)
		{
			this.setState({submissionWarnings});
			return;
		}

		this.actuallySaveBlueprintEdits();
	};

	handleForceSaveBlueprintEdits = (event) =>
	{
		event.preventDefault();

		const submissionErrors = this.validateInputs();
		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		this.actuallySaveBlueprintEdits();
	};

	actuallySaveBlueprintEdits = async () =>
	{
		const imageUrl = this.state.blueprint.imageUrl;

		const regexPatterns = {
			imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
			imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
		};
		const matches = Object.values(regexPatterns)
			.map(pattern => pattern.exec(imageUrl))
			.filter(Boolean);
		if (matches.length <= 0)
		{
			console.log('EditBlueprint.actuallySaveBlueprintEdits error in imageUrl', {imageUrl});
			return;
		}

		const match = matches[0];
		const imgurId = match[1];
		const image   = {
			id  : imgurId,
			type: 'image/png',
		};

		const currentImageId = this.props.blueprint.image && this.props.blueprint.image.id;
		const currentImageType = this.props.blueprint.image && this.props.blueprint.image.type;
		const shouldUpdateImage = imgurId !== currentImageId || !this.state.blueprint.imageUrl.includes(currentImageId);

		const updates = {
			[`/blueprints/${this.props.id}/title`]                   : this.state.blueprint.title,
			[`/blueprints/${this.props.id}/blueprintString`]         : this.state.blueprint.blueprintString,
			[`/blueprints/${this.props.id}/descriptionMarkdown`]     : this.state.blueprint.descriptionMarkdown,
			[`/blueprints/${this.props.id}/tags`]                    : this.state.blueprint.tags,
			[`/blueprints/${this.props.id}/lastUpdatedDate`]         : firebase.database.ServerValue.TIMESTAMP,
			[`/blueprintSummaries/${this.props.id}/title/`]          : this.state.blueprint.title,
			[`/blueprintSummaries/${this.props.id}/lastUpdatedDate/`]: firebase.database.ServerValue.TIMESTAMP,
		};

		if (shouldUpdateImage)
		{
			updates[`/blueprints/${this.props.id}/image`] = image;
			updates[`/blueprintSummaries/${this.props.id}/imgurId/`] = image.id;
			updates[`/blueprintSummaries/${this.props.id}/imgurType/`] = image.type;
		}

		this.props.tags.forEach((tag) =>
		{
			updates[`/byTag/${tag}/${this.props.id}`] = null;
		});
		forEach(this.state.blueprint.tags, (tag) =>
		{
			updates[`/byTag/${tag}/${this.props.id}`] = true;
		});

		try
		{
			await app.database().ref().update(updates);
			this.props.history.push(`/view/${this.props.id}`);
		}
		catch (e)
		{
			console.log(e);
			return;
		}
	};

	handleCancel = () =>
	{
		this.props.history.push(`/view/${this.props.id}`);
	};

	handleShowConfirmDelete = (event) =>
	{
		event.preventDefault();
		this.setState({deletionModalVisible: true});
	};

	handleHideConfirmDelete = () =>
	{
		this.setState({deletionModalVisible: false});
	};

	handleDeleteBlueprint = () =>
	{
		const authorId = this.state.blueprint.author.userId;
		const updates  = {
			[`/blueprints/${this.props.id}`]                  : null,
			[`/users/${authorId}/blueprints/${this.props.id}`]: null,
			[`/blueprintSummaries/${this.props.id}`]          : null,
		};
		this.props.tags.forEach((tag) =>
		{
			updates[`/byTag/${tag}/${this.props.id}`] = null;
		});
		app.database().ref().update(updates)
			.then(() => this.props.history.push(`/user/${authorId}`));
	};

	parseBlueprint = (blueprintString) =>
	{
		try
		{
			return new Blueprint(blueprintString);
		}
		catch (ignored)
		{
			console.log('EditBlueprint.parseBlueprint', {ignored});
			return undefined;
		}
	};

	handleTagSelection = (selectedTags) =>
	{
		const tags = selectedTags.map(each => each.value);
		this.setState({
			blueprint: {
				...this.state.blueprint,
				tags,
			},
		});
	};

	addTag = (tag) =>
	{
		this.setState(update(this.state, {
			blueprint: {tags: {$push: [tag]}},
		}));
	};

	renderOldThumbnail = () =>
	{
		const {id, type} = this.state.blueprint.image;
		const imageUrl  = buildImageUrl(id, type, 'b');

		return (
			<Form.Group as={Row} className='mb-3'>
				<Form.Label column sm='2'>
					{'Old screenshot'}
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img variant='top' src={imageUrl || noImageAvailable} />
						<Card.Title className='truncate'>
							{this.state.blueprint.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	};

	renderPreview = () =>
	{
		if (!this.state.blueprint.imageUrl)
		{
			return;
		}

		const goodRegex1 = /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/;
		const match      = this.state.blueprint.imageUrl.match(goodRegex1);
		if (!match)
		{
			return (
				<Form.Group as={Row} className='mb-3'>
					<Form.Label column sm='2'>
						{'Attached screenshot'}
					</Form.Label>
					<Col sm={10}>
						<Card className='m-0'>
							<Card.Title className='m-2'>
								{'Please use a direct link to an image like https://imgur.com/{id}. Click on the "Copy Link" button on the Imgur image page.'}
							</Card.Title>
						</Card>
					</Col>
				</Form.Group>
			);
		}

		const imgurId  = match[1];
		const imageUrl = buildImageUrl(imgurId, 'image/png', 'b');

		return (
			<Form.Group as={Row} className='mb-3'>
				<Form.Label column sm='2'>
					{'Attached screenshot'}
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img variant='top' src={imageUrl || noImageAvailable} />
						<Card.Title className='truncate'>
							{this.state.blueprint.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	};

	render()
	{
		if (!this.props.user)
		{
			return (
				<>
					<h1 className='display-4'>
						{'Edit a Blueprint'}
					</h1>
					<p className='lead'>
						{'Please log in with Google or GitHub in order to add a Blueprint.'}
					</p>
				</>
			);
		}

		if (this.props.loading)
		{
			return (
				<h1>
					<FontAwesomeIcon icon={faCog} spin />
					{' Loading data'}
				</h1>
			);
		}

		const {blueprint} = this.state;
		if (!blueprint)
		{
			return <NoMatch />;
		}

		const ownedByCurrentUser = this.props.user && this.props.user.uid === blueprint.author.userId;
		if (!ownedByCurrentUser && !this.props.isModerator)
		{
			return (
				<h1>
					You are not the author of this blueprint.
				</h1>
			);
		}

		const allTagSuggestions    = generateTagSuggestions(
			this.state.blueprint.title,
			this.state.parsedBlueprint,
			this.state.v15Decoded
		);
		const unusedTagSuggestions = difference(allTagSuggestions, this.state.blueprint.tags);

		return (
			<>
				<Modal show={this.state.uploadProgressBarVisible}>
					<Modal.Header>
						<Modal.Title>
							Image Upload Progress
						</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<ProgressBar
							now={this.state.uploadProgressPercent}
							label={`${this.state.uploadProgressPercent}%`}
							variant='warning'
							className='text-light'
						/>
					</Modal.Body>
				</Modal>
				<Modal show={!isEmpty(this.state.submissionWarnings)}>
					<Modal.Header>
						<Modal.Title>
							{'Submission warnings'}
						</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<p>
							{'The following warnings occurred while submitting your blueprint. Do you want to save it anyway or go back and make further edits?'}
						</p>
						<ul>
							{
								this.state.submissionWarnings.map(submissionWarning => (
									<li key={submissionWarning}>
										{submissionWarning}
									</li>
								))
							}
						</ul>
					</Modal.Body>
					<Modal.Footer>
						<ButtonToolbar>
							<Button variant='danger' type='button' onClick={this.handleForceSaveBlueprintEdits}>
								<FontAwesomeIcon icon={faSave} size='lg' />
								{' Save'}
							</Button>
							<Button variant='primary' type='button' onClick={this.handleDismissWarnings}>
								<FontAwesomeIcon icon={faArrowLeft} size='lg' />
								{' Go back'}
							</Button>
						</ButtonToolbar>
					</Modal.Footer>
				</Modal>
				<Modal show={this.state.deletionModalVisible} onHide={this.handleHideConfirmDelete}>
					<Modal.Header closeButton>
						<Modal.Title>
							Are you sure you want to delete the blueprint?
						</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<p>
							{`Deleting: ${blueprint.title}`}
						</p>
						<p>
							This cannot be undone.
						</p>
					</Modal.Body>
					<Modal.Footer>
						<ButtonToolbar>
							<Button variant='danger' type='button' onClick={this.handleDeleteBlueprint}>
								Delete
							</Button>
							<Button onClick={this.handleHideConfirmDelete}>
								Cancel
							</Button>
						</ButtonToolbar>
					</Modal.Footer>
				</Modal>
				<Container>
					<Row>
						{
							this.state.submissionErrors.length > 0 && <Alert
								variant='danger'
								className='alert-fixed'
								dismissible
								onClose={this.handleDismissError}
							>
								<h4>
									{'Error editing blueprint'}
								</h4>
								<ul>
									{
										this.state.submissionErrors.map(submissionError => (
											<li key={submissionError}>
												{submissionError}
											</li>
										))
									}
								</ul>
							</Alert>
						}
					</Row>
					<PageHeader title={`Editing: ${blueprint.title}`} />
					<Row>
						<Form className='w-100'>
							<Form.Group as={Row} className='mb-3'>
								<Form.Label column sm='2'>
									{'Title'}
								</Form.Label>
								<Col sm={10}>
									<FormControl
										autoFocus
										type='text'
										name='title'
										placeholder='Title'
										value={blueprint.title}
										onChange={this.handleChange}
									/>
								</Col>
							</Form.Group>

							<Form.Group as={Row} className='mb-3'>
								<Form.Label column sm='2'>
									{'Description '}
									<a href='https://guides.github.com/features/mastering-markdown/'>
										{'[Tutorial]'}
									</a>
								</Form.Label>
								<Col sm={10}>
									<FormControl
										as='textarea'
										placeholder='Description (plain text or *GitHub Flavored Markdown*)'
										value={blueprint.descriptionMarkdown}
										onChange={this.handleDescriptionChanged}
										style={{minHeight: 200}}
									/>
								</Col>
							</Form.Group>

							<Form.Group as={Row} className='mb-3'>
								<Form.Label column sm='2'>
									{'Description (Preview)'}
								</Form.Label>
								<Col sm={10}>
									<Card>
										<div
											style={{minHeight: 200}}
											dangerouslySetInnerHTML={{__html: this.state.renderedMarkdown}}
										/>
									</Card>
								</Col>
							</Form.Group>

							<Form.Group as={Row} className='mb-3'>
								<Form.Label column sm='2'>
									{'Blueprint String'}
								</Form.Label>
								<Col sm={10}>
									<FormControl
										className='blueprintString'
										as='textarea'
										name='blueprintString'
										placeholder='Blueprint String'
										value={blueprint.blueprintString}
										onChange={this.handleChange}
									/>
								</Col>
							</Form.Group>

							{
								unusedTagSuggestions.length > 0
								&& <Form.Group as={Row} className='mb-3'>
									<Form.Label column sm='2'>
										{'Tag Suggestions'}
									</Form.Label>
									<Col sm={10}>
										<ButtonToolbar>
											{
												unusedTagSuggestions.map(tagSuggestion => (
													<TagSuggestionButton
														key={tagSuggestion}
														tagSuggestion={tagSuggestion}
														addTag={this.addTag}
													/>
												))
											}
										</ButtonToolbar>
									</Col>
								</Form.Group>
							}

							<Form.Group as={Row} className='mb-3'>
								<Form.Label column sm='2'>
									{'Tags'}
								</Form.Label>
								<Col sm={10}>
									<Select
										value={this.state.blueprint.tags.map(value => ({value, label: value}))}
										options={this.props.tags.map(value => ({value, label: value}))}
										onChange={this.handleTagSelection}
										isMulti
										placeholder='Select at least one tag'
									/>
								</Col>
							</Form.Group>

							{this.renderOldThumbnail()}

							<Form.Group as={Row} className='mb-3'>
								<Form.Label column sm='2'>
									{'Imgur URL'}
								</Form.Label>
								<Col sm={10}>
									<FormControl
										autoFocus
										type='text'
										name='imageUrl'
										placeholder='https://imgur.com/kRua41d'
										value={blueprint.imageUrl}
										onChange={this.handleChange}
									/>
								</Col>
							</Form.Group>

							{this.renderPreview()}

							<Form.Group as={Row} className='mb-3'>
								<Col sm={{span: 10, offset: 2}}>
									<ButtonToolbar>
										<Button
											type='button'
											variant='warning'
											size='lg'
											onClick={this.handleSaveBlueprintEdits}
										>
											<FontAwesomeIcon icon={faSave} size='lg' />
											{' Save'}
										</Button>
										{
											this.props.isModerator && <Button
												variant='danger'
												size='lg'
												onClick={this.handleShowConfirmDelete}
											>
												<FontAwesomeIcon icon={faTrash} size='lg' />
												{' Delete'}
											</Button>
										}
										<Button
											type='button'
											size='lg'
											onClick={this.handleCancel}
										>
											<FontAwesomeIcon icon={faBan} size='lg' />
											{' Cancel'}
										</Button>
									</ButtonToolbar>
								</Col>
							</Form.Group>
						</Form>
					</Row>
				</Container>
			</>
		);
	}
}

const mapStateToProps = (storeState, ownProps) =>
{
	const id = ownProps.match.params.blueprintId;
	return {
		id,
		user       : selectors.getFilteredUser(storeState),
		isModerator: selectors.getIsModerator(storeState),
		blueprint  : selectors.getBlueprintDataById(storeState, {id}),
		loading    : selectors.getBlueprintLoadingById(storeState, ownProps),
		tags       : selectors.getTags(storeState),
	};
};

const mapDispatchToProps = dispatch =>
	bindActionCreators({subscribeToBlueprint, subscribeToModerators, subscribeToTags}, dispatch);

const ConnectedEditBlueprint = connect(mapStateToProps, mapDispatchToProps)(EditBlueprint);

// Wrapper to provide router props to class component
function EditBlueprintWrapper()
{
	const params = useParams();
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<ConnectedEditBlueprint
			id={params.blueprintId}
			location={location}
			history={{push: navigate}}
			match={{
				params : {blueprintId: params.blueprintId},
				path   : '/edit/:blueprintId',
				url    : `/edit/${params.blueprintId}`,
				isExact: true,
			}}
		/>
	);
}

export default EditBlueprintWrapper;
