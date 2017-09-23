/* eslint-disable dot-notation */
import {forbidExtraProps} from 'airbnb-prop-types';
import firebase from 'firebase';
import update from 'immutability-helper';
import difference from 'lodash/difference';
import forEach from 'lodash/forEach';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import some from 'lodash/some';

import marked from 'marked';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Alert from 'react-bootstrap/lib/Alert';
import Button from 'react-bootstrap/lib/Button';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import Col from 'react-bootstrap/lib/Col';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Grid from 'react-bootstrap/lib/Grid';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import Modal from 'react-bootstrap/lib/Modal';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Panel from 'react-bootstrap/lib/Panel';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';
import Row from 'react-bootstrap/lib/Row';
import Thumbnail from 'react-bootstrap/lib/Thumbnail';

import Dropzone from 'react-dropzone';
import FontAwesome from 'react-fontawesome';
import {connect} from 'react-redux';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import {bindActionCreators} from 'redux';

import {subscribeToBlueprint, subscribeToModerators, subscribeToTags} from '../actions/actionCreators';
import {app} from '../base';
import Blueprint from '../Blueprint';
import noImageAvailable from '../gif/No_available_image.gif';
import buildImageUrl from '../helpers/buildImageUrl';
import generateTagSuggestions from '../helpers/generateTagSuggestions';
import scaleImage from '../helpers/ImageScaler';
import {blueprintSchema, historySchema, locationSchema, userSchema} from '../propTypes';
import * as selectors from '../selectors';

import NoMatch from './NoMatch';
import TagSuggestionButton from './TagSuggestionButton';

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

class EditBlueprint extends PureComponent
{
	static propTypes = forbidExtraProps({
		id                   : PropTypes.string.isRequired,
		tags                 : PropTypes.arrayOf(PropTypes.string).isRequired,
		subscribeToBlueprint : PropTypes.func.isRequired,
		subscribeToModerators: PropTypes.func.isRequired,
		subscribeToTags      : PropTypes.func.isRequired,
		isModerator          : PropTypes.bool.isRequired,
		user                 : userSchema,
		blueprint            : blueprintSchema,
		loading              : PropTypes.bool.isRequired,
		match                : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({
				blueprintId: PropTypes.string.isRequired,
			})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})).isRequired,
		location             : locationSchema,
		history              : historySchema,
		staticContext        : PropTypes.shape(forbidExtraProps({})),
	});

	static emptyTags = [];

	static imgurHeaders = {
		'Accept'       : 'application/json',
		'Content-Type' : 'application/json',
		'Authorization': 'Client-ID 46a3f144b6a0882',
	};

	state = {
		thumbnail               : undefined,
		renderedMarkdown        : '',
		files                   : [],
		rejectedFiles           : [],
		submissionErrors        : [],
		submissionWarnings      : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		deletionModalVisible    : false,
	};

	componentWillMount()
	{
		this.props.subscribeToBlueprint(this.props.id);
		this.props.subscribeToTags();
		if (!isEmpty(this.props.user))
		{
			this.props.subscribeToModerators();
		}

		this.cacheBlueprintState(this.props);
	}

	componentWillReceiveProps(nextProps)
	{
		if (!isEqual(this.props.user, nextProps.user) && !isEmpty(nextProps.user))
		{
			nextProps.subscribeToModerators();
		}
		this.cacheBlueprintState(nextProps);
	}

	cacheBlueprintState = (props) =>
	{
		if (props.blueprint)
		{
			const blueprint = {
				...props.blueprint,
				tags: props.blueprint.tags || EditBlueprint.emptyTags,
			};

			const renderedMarkdown = marked(blueprint.descriptionMarkdown);
			const parsedBlueprint  = this.parseBlueprint(blueprint.blueprintString);
			const v15Decoded       = parsedBlueprint.getV15Decoded();

			this.setState({
				blueprint,
				renderedMarkdown,
				parsedBlueprint,
				v15Decoded,
			});
		}
	};

	handleDismissAlert = () =>
	{
		this.setState({rejectedFiles: []});
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
		const renderedMarkdown    = marked(descriptionMarkdown);
		this.setState({
			renderedMarkdown,
			blueprint: {
				...this.state.blueprint,
				descriptionMarkdown,
			},
		});
	};

	handleDrop = (acceptedFiles, rejectedFiles) =>
	{
		this.setState({
			files    : acceptedFiles,
			rejectedFiles,
			blueprint: {
				...this.state.blueprint,
				imageUrl: acceptedFiles.length > 1 && acceptedFiles[0].preview,
			},
		});

		if (acceptedFiles.length === 0)
		{
			return;
		}

		const config = {
			maxWidth : 350,
			maxHeight: 600,
			quality  : 0.70,
		};
		scaleImage(acceptedFiles[0], config, (imageData) =>
		{
			this.setState({thumbnail: imageData});
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

		return submissionErrors;
	};

	validateWarnings = () =>
	{
		const submissionWarnings = [];

		if (isEmpty(this.state.blueprint.tags))
		{
			submissionWarnings.push('The blueprint has no tags. Consider adding a few tags.');
		}

		const blueprint = new Blueprint(this.state.blueprint.blueprintString.trim());
		if (blueprint.decodedObject === null)
		{
			submissionWarnings.push('Could not parse blueprint.');
			return submissionWarnings;
		}

		if (blueprint.isV14())
		{
			submissionWarnings.push('Blueprint is in 0.14 format. Consider upgrading to the latest version.');
		}

		if (!blueprint.isBook() && isEmpty(this.state.v15Decoded.blueprint.label))
		{
			submissionWarnings.push('Blueprint has no name. Consider adding a name.');
		}
		if (!blueprint.isBook() && isEmpty(this.state.v15Decoded.blueprint.icons))
		{
			submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
		}

		if (blueprint.isBook() && some(this.state.v15Decoded.blueprint_book.blueprints, eachBlueprint => isEmpty(eachBlueprint.blueprint.label)))
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

	actuallySaveBlueprintEdits = () =>
	{
		const [file] = this.state.files;
		let imagePromise;
		let uploadTask;
		if (file)
		{
			const fileNameRef = app.storage().ref().child(file.name);
			imagePromise      = fileNameRef.getDownloadURL()
				.then(() =>
				{
					this.setState({submissionErrors: [`File with name ${file.name} already exists.`]});
				})
				.catch(() =>
				{
					this.setState({uploadProgressBarVisible: true});
					uploadTask = fileNameRef.put(file);
					uploadTask.on('state_changed', this.handleUploadProgress, this.handleFirebaseStorageError);
					return uploadTask;
				})
				.then(() =>
					fetch('https://api.imgur.com/3/upload.json', {
						method : 'POST',
						headers: EditBlueprint.imgurHeaders,
						body   : file,
					}))
				.catch(this.handleImgurError)
				.then(this.processStatus)
				.then(response => response.json())
				.then(json => json.data)
				.then(data =>
					({
						id        : data.id,
						deletehash: data.deletehash,
						type      : data.type,
						height    : data.height,
						width     : data.width,
					}));
		}
		else
		{
			imagePromise = Promise.resolve(this.state.blueprint.image);
		}

		imagePromise.then((image) =>
		{
			const updates = {
				[`/blueprints/${this.props.id}/title`]              : this.state.blueprint.title,
				[`/blueprints/${this.props.id}/blueprintString`]    : this.state.blueprint.blueprintString,
				[`/blueprints/${this.props.id}/descriptionMarkdown`]: this.state.blueprint.descriptionMarkdown,
				[`/blueprints/${this.props.id}/tags`]               : this.state.blueprint.tags,
				[`/blueprints/${this.props.id}/lastUpdatedDate`]    : firebase.database.ServerValue.TIMESTAMP,
				[`/blueprints/${this.props.id}/image`]              : image,
				[`/blueprintSummaries/${this.props.id}/title/`]     : this.state.blueprint.title,
				[`/blueprintSummaries/${this.props.id}/imgurId/`]   : image.id,
				[`/blueprintSummaries/${this.props.id}/imgurType/`] : image.type,
				// TODO: What about height, width, and deletehash?
			};

			if (file)
			{
				updates[`/blueprints/${this.props.id}/fileName/`] = file.name;
			}
			if (uploadTask)
			{
				updates[`/blueprints/${this.props.id}/imageUrl/`] = uploadTask.snapshot.downloadURL;
			}
			if (this.state.thumbnail)
			{
				updates[`/thumbnails/${this.props.id}`] = this.state.thumbnail;
			}
			this.props.tags.forEach((tag) =>
			{
				updates[`/byTag/${tag}/${this.props.id}`] = null;
			});
			forEach(this.state.blueprint.tags, (tag) =>
			{
				updates[`/byTag/${tag}/${this.props.id}`] = true;
			});

			app.database().ref().update(updates);
		})
			.then(() => this.props.history.push(`/view/${this.props.id}`))
			.catch(console.log);
		// TODO: Delete old images from storage and imgur
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
			[`/thumbnails/${this.props.id}`]                  : null,
			[`/blueprintSummaries/${this.props.id}`]          : null,
		};
		this.props.tags.forEach((tag) =>
		{
			updates[`/byTag/${tag}/${this.props.id}`] = null;
		});
		app.database().ref().update(updates)
			.then(() =>
			{
				if (this.state.blueprint.fileName)
				{
					// TODO also delete imgur image
					const fileNameRef = app.storage().ref().child(this.state.blueprint.fileName);
					return fileNameRef.delete();
				}
				return undefined;
			})
			.then(() => this.props.history.push(`/user/${authorId}`))
			.catch(console.log);
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
		const thumbnail  = buildImageUrl(id, type, 'b');

		return (
			<FormGroup controlId='formHorizontalBlueprint'>
				<Col componentClass={ControlLabel} sm={2}>{'Old screenshot'}</Col>
				<Col sm={10}>
					<Row>
						<Col xs={6} md={3}>
							<Thumbnail src={thumbnail}>
								<h4 className='truncate'>{this.state.blueprint.title}</h4>
							</Thumbnail>
						</Col>
					</Row>
				</Col>
			</FormGroup>
		);
	};

	renderPreview = () =>
	{
		if (!this.state.thumbnail)
		{
			return <div />;
		}

		return (
			<FormGroup controlId='formHorizontalBlueprint'>
				<Col componentClass={ControlLabel} sm={2}>{'Attached screenshot'}</Col>
				<Col sm={10}>
					<Row>
						<Col xs={6} md={3}>
							<Thumbnail src={this.state.thumbnail || this.state.blueprint.imageUrl || noImageAvailable}>
								<h4 className='truncate'>{this.state.blueprint.title}</h4>
							</Thumbnail>
						</Col>
					</Row>
				</Col>
			</FormGroup>
		);
	};

	render()
	{
		if (!this.props.user)
		{
			return (
				<Jumbotron>
					<h1>{'Create a Blueprint'}</h1>
					<p>{'Please log in with Google or GitHub in order to edit a Blueprint.'}</p>
				</Jumbotron>
			);
		}

		if (this.props.loading)
		{
			return (
				<Jumbotron>
					<h1>
						<FontAwesome name='cog' spin />
						{' Loading data'}
					</h1>
				</Jumbotron>
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
			return <Jumbotron><h1>{'You are not the author of this blueprint.'}</h1></Jumbotron>;
		}

		const allTagSuggestions    = generateTagSuggestions(
			this.state.blueprint.title,
			this.state.parsedBlueprint,
			this.state.v15Decoded);
		const unusedTagSuggestions = difference(allTagSuggestions, this.state.blueprint.tags);

		return (
			<div>
				<Modal show={this.state.uploadProgressBarVisible}>
					<Modal.Header>
						<Modal.Title>Image Upload Progress</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<ProgressBar
							active
							now={this.state.uploadProgressPercent}
							label={`${this.state.uploadProgressPercent}%`}
						/>
					</Modal.Body>
				</Modal>
				<Modal show={!isEmpty(this.state.submissionWarnings)}>
					<Modal.Header>
						<Modal.Title>{'Submission warnings'}</Modal.Title>
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
							<Button bsStyle='danger' onClick={this.handleForceSaveBlueprintEdits}>
								<FontAwesome name='floppy-o' size='lg' />
								{' Save'}
							</Button>
							<Button bsStyle='primary' onClick={this.handleDismissWarnings}>
								<FontAwesome name='arrow-left' size='lg' />
								{' Go back'}
							</Button>
						</ButtonToolbar>
					</Modal.Footer>
				</Modal>
				<Modal show={this.state.deletionModalVisible} onHide={this.handleHideConfirmDelete}>
					<Modal.Header closeButton>
						<Modal.Title>Are you sure you want to delete the blueprint?</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<p>Deleting: {blueprint.title}</p>
						<p>This cannot be undone.</p>
					</Modal.Body>
					<Modal.Footer>
						<ButtonToolbar>
							<Button bsStyle='danger' onClick={this.handleDeleteBlueprint}>Delete</Button>
							<Button onClick={this.handleHideConfirmDelete}>Cancel</Button>
						</ButtonToolbar>
					</Modal.Footer>
				</Modal>
				<Grid>
					<Row>
						{
							this.state.rejectedFiles.length > 0 && <Alert
								bsStyle='warning'
								className='alert-fixed'
								onDismiss={this.handleDismissAlert}
							>
								<h4>{'Error uploading files'}</h4>
								<ul>
									{
										this.state.rejectedFiles.map(rejectedFile => (
											<li key={rejectedFile.name}>
												{rejectedFile.name}
											</li>
										))
									}
								</ul>
							</Alert>
						}
						{
							this.state.submissionErrors.length > 0 && <Alert
								bsStyle='danger'
								className='alert-fixed'
								onDismiss={this.handleDismissError}
							>
								<h4>{'Error editing blueprint'}</h4>
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
					<Row>
						<PageHeader>
							{'Editing: '}
							{blueprint.title}
						</PageHeader>
					</Row>
					<Row>
						<form className='form-horizontal'>
							<FormGroup controlId='formHorizontalTitle'>
								<Col componentClass={ControlLabel} sm={2} autoFocus>
									{'Title'}
								</Col>
								<Col sm={10}>
									<FormControl
										type='text'
										name='title'
										placeholder='Title'
										value={blueprint.title}
										onChange={this.handleChange}
									/>
								</Col>
							</FormGroup>

							<FormGroup controlId='formHorizontalDescription'>
								<Col componentClass={ControlLabel} sm={2}>
									{'Description '}
									<a href='https://guides.github.com/features/mastering-markdown/'>
										{'[Tutorial]'}
									</a>
								</Col>
								<Col sm={10}>
									<FormControl
										componentClass='textarea'
										placeholder='Description (plain text or *GitHub Flavored Markdown*)'
										value={blueprint.descriptionMarkdown}
										onChange={this.handleDescriptionChanged}
										style={{minHeight: 200}}
									/>
								</Col>
							</FormGroup>

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Description (Preview)'}</Col>
								<Col sm={10}>
									<Panel>
										<div
											style={{minHeight: 200}}
											dangerouslySetInnerHTML={{__html: this.state.renderedMarkdown}}
										/>
									</Panel>
								</Col>
							</FormGroup>

							<FormGroup controlId='formHorizontalBlueprint'>
								<Col componentClass={ControlLabel} sm={2}>{'Blueprint String'}</Col>
								<Col sm={10}>
									<FormControl
										componentClass='textarea'
										name='blueprintString'
										placeholder='Blueprint String'
										value={blueprint.blueprintString}
										className='blueprintString'
										onChange={this.handleChange}
									/>
								</Col>
							</FormGroup>

							{
								unusedTagSuggestions.length > 0
								&& <FormGroup>
									<Col componentClass={ControlLabel} sm={2}>{'Tag Suggestions'}</Col>
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
								</FormGroup>
							}

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Tags'}</Col>
								<Col sm={10}>
									<Select
										value={this.state.blueprint.tags}
										options={this.props.tags.map(value => ({value, label: value}))}
										onChange={this.handleTagSelection}
										multi
										placeholder='Select at least one tag'
									/>
								</Col>
							</FormGroup>

							{this.renderOldThumbnail()}

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Replacement screenshot'}</Col>
								<Col sm={10}>
									<div>
										<Dropzone
											accept=' image/*'
											maxSize={10000000}
											className='dropzone'
											onDrop={this.handleDrop}
										>
											<div>
												{'Drop an image file here, or click to open the file chooser.'}
											</div>
										</Dropzone>
									</div>
								</Col>
							</FormGroup>

							{this.renderPreview()}

							<FormGroup>
								<Col smOffset={2} sm={10}>
									<ButtonToolbar>
										<Button
											bsStyle='primary'
											bsSize='large'
											onClick={this.handleSaveBlueprintEdits}
										>
											<FontAwesome name='floppy-o' size='lg' />
											{' Save'}
										</Button>
										{
											this.props.isModerator && <Button
												bsStyle='danger'
												bsSize='large'
												onClick={this.handleShowConfirmDelete}
											>
												<FontAwesome name='trash-o' size='lg' />
												{' Delete'}
											</Button>
										}
										<Button
											bsSize='large'
											onClick={this.handleCancel}
										>
											<FontAwesome name='ban' size='lg' />
											{' Cancel'}
										</Button>
									</ButtonToolbar>
								</Col>
							</FormGroup>
						</form>
					</Row>
				</Grid>
			</div>
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

export default connect(mapStateToProps, mapDispatchToProps)(EditBlueprint);

