import {faArrowLeft, faBan, faCog, faSave, faTrash} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}                            from '@fortawesome/react-fontawesome';

import {forbidExtraProps}     from 'airbnb-prop-types';
import axios                  from 'axios';
import classNames             from 'classnames';
import update                 from 'immutability-helper';
import difference             from 'lodash/difference';
import isEmpty                from 'lodash/isEmpty';
import isEqual                from 'lodash/isEqual';
import some                   from 'lodash/some';
import marked                 from 'marked';
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
import Dropzone               from 'react-dropzone';
import {connect}              from 'react-redux';
import Select                 from 'react-select';
import 'react-select/dist/react-select.css';
import {bindActionCreators}   from 'redux';

import {subscribeToBlueprint, subscribeToTags} from '../actions/actionCreators';

import {app}                  from '../base';
import Blueprint              from '../Blueprint';
import UserContext            from '../context/userContext';
import noImageAvailable       from '../gif/No_available_image.gif';
import buildImageUrl          from '../helpers/buildImageUrl';
import generateTagSuggestions from '../helpers/generateTagSuggestions';
import scaleImage             from '../helpers/ImageScaler';
import * as propTypes         from '../propTypes';
import BlueprintProjection    from '../propTypes/BlueprintProjection';
import TagProjection          from '../propTypes/TagProjection';
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
	static contextType = UserContext;

	static propTypes = forbidExtraProps({
		id                   : PropTypes.string.isRequired,
		tags                 : PropTypes.arrayOf(TagProjection).isRequired,
		subscribeToBlueprint : PropTypes.func.isRequired,
		subscribeToTags      : PropTypes.func.isRequired,
		isModerator          : PropTypes.bool.isRequired,
		user                 : propTypes.userSchema,
		blueprint            : BlueprintProjection,
		loading              : PropTypes.bool.isRequired,
		match                : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({
				blueprintId: PropTypes.string.isRequired,
			})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})).isRequired,
		location             : propTypes.locationSchema,
		history              : propTypes.historySchema,
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

	UNSAFE_componentWillMount()
	{
		this.props.subscribeToBlueprint(this.props.id);
		this.props.subscribeToTags();

		this.cacheBlueprintState(this.props);
	}

	UNSAFE_componentWillReceiveProps(nextProps)
	{
		this.cacheBlueprintState(nextProps);
	}

	cacheBlueprintState = (props) =>
	{
		if (isEmpty(props.blueprint))
		{
			this.setState({
				blueprint         : undefined,
				renderedMarkdown  : undefined,
				parsedBlueprint   : undefined,
				v15Decoded        : undefined,
			});
			return;
		}

		const blueprint = {
			...props.blueprint,
			tags: props.blueprint.tags || EditBlueprint.emptyTags,
		};

		const renderedMarkdown = marked(blueprint.descriptionMarkdown);
		const parsedBlueprint  = this.parseBlueprint(blueprint.blueprintString.blueprintString);
		const v15Decoded       = parsedBlueprint.getV15Decoded();

		this.setState({
			blueprint,
			renderedMarkdown,
			parsedBlueprint,
			v15Decoded,
		});
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
		else if (blueprint.blueprintString.blueprintString.trim().length < 10)
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

		const blueprint = new Blueprint(this.state.blueprint.blueprintString.blueprintString.trim());
		if (isEmpty(blueprint.decodedObject))
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

	actuallySaveBlueprintEdits = async () =>
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

		const blueprint = {
			...this.state.blueprint,
			privateData: {
				thumbnailData: this.state.thumbnail,
			},
		};

		if (file)
		{
			blueprint.privateData.fileName = file.name;
		}

		if (imagePromise)
		{
			const image = await imagePromise;
			if (image)
			{
				blueprint.imgurImage = {
					imgurId  : image.id,
					imgurType: image.type,
					height   : image.height,
					width    : image.width,
				};
			}
		}

		if (uploadTask)
		{
			const firebaseImageUrl = await uploadTask.snapshot.ref.getDownloadURL();
			blueprint.privateData.firebaseImageUrl = firebaseImageUrl;
		}

		await axios.patch(
			 `${process.env.REACT_APP_REST_URL}/api/blueprint/${this.props.id}`,
			 blueprint,
			 {
				 headers: {
					 Authorization: `Bearer ${this.context.idToken}`,
				 },
			 });

		this.props.history.push(`/view/${this.props.id}`)

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
		const tags = selectedTags.map(({tag}) => tag);
		console.log({selectedTags, tags});
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
			blueprint: {tags: {$push: [{tag}]}},
		}));
	};

	renderOldThumbnail = () =>
	{
		const {imgurId, imgurType} = this.state.blueprint.imgurImage;
		const thumbnail = buildImageUrl(imgurId, imgurType, 'b');

		return (
			<Form.Group as={Row}>
				<Form.Label column sm='2'>
					Old screenshot
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img variant='top' src={thumbnail} />
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
		if (!this.state.thumbnail)
		{
			return <div />;
		}

		return (
			<Form.Group as={Row}>
				<Form.Label column sm='2'>
					{'Attached screenshot'}
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img variant='top' src={this.state.thumbnail || this.state.imageUrl || noImageAvailable} />
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
					<h1>
						{'Edit a Blueprint'}
					</h1>
					<p>
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

		const selectValue = this.state.blueprint.tags.map(each => each.tag).map(tag => `/${tag.category}/${tag.name}/`);
		const selectOptions = this.props.tags.map(tag => ({tag, value: `/${tag.category}/${tag.name}/`, label: `/${tag.category}/${tag.name}/`}));
		console.log({selectValue, selectOptions});

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
							this.state.rejectedFiles.length > 0 && <Alert
								variant='warning'
								className='alert-fixed'
								onDismiss={this.handleDismissAlert}
							>
								<h4>
									{'Error uploading files'}
								</h4>
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
								variant='danger'
								className='alert-fixed'
								onDismiss={this.handleDismissError}
							>
								<h4>
									Error editing blueprint
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
							<Form.Group as={Row}>
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

							<Form.Group as={Row}>
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

							<Form.Group as={Row}>
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

							<Form.Group as={Row}>
								<Form.Label column sm='2'>
									{'Blueprint String'}
								</Form.Label>
								<Col sm={10}>
									<FormControl
										className='blueprintString'
										as='textarea'
										name='blueprintString'
										placeholder='Blueprint String'
										value={blueprint.blueprintString.blueprintString}
										onChange={this.handleChange}
									/>
								</Col>
							</Form.Group>

							{
								unusedTagSuggestions.length > 0
								&& <Form.Group as={Row}>
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

							<Form.Group as={Row}>
								<Form.Label column sm='2'>
									{'Tags'}
								</Form.Label>
								<Col sm={10}>
									<Select
										value={selectValue}
										options={selectOptions}
										onChange={this.handleTagSelection}
										multi
										placeholder='Select at least one tag'
									/>
								</Col>
							</Form.Group>

							{this.renderOldThumbnail()}

							<Form.Group as={Row}>
								<Form.Label column sm='2'>
									Replacement screenshot
								</Form.Label>
								<Col sm={10}>
									<Dropzone
										accept=' image/*'
										maxSize={10000000}
										onDrop={this.handleDrop}
									>
										{({getRootProps, getInputProps, isDragActive}) => (
											<div
												{...getRootProps()}
												className={classNames('dropzone', {'dropzone--isActive': isDragActive})}
											>
												<input {...getInputProps()} />
												{
													isDragActive
														? <p>Drop files here...</p>
														: <p>
															{'Drop an image file here, or click to open the file chooser.'}
														</p>
												}
											</div>
										)}
									</Dropzone>
								</Col>
							</Form.Group>

							{this.renderPreview()}

							<Form.Group as={Row}>
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
	bindActionCreators({subscribeToBlueprint, subscribeToTags}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(EditBlueprint);

