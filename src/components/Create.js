import {forbidExtraProps} from 'airbnb-prop-types';
import firebase from 'firebase';

import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
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

import {app} from '../base';
import Blueprint from '../Blueprint';
import {subscribeToTags} from '../actions/actionCreators';
import noImageAvailable from '../gif/No_available_image.gif';
import scaleImage from '../helpers/ImageScaler';
import {historySchema, locationSchema, userSchema} from '../propTypes';

import * as selectors from '../selectors';

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

class Create extends PureComponent
{
	static propTypes = forbidExtraProps({
		user         : userSchema,
		subscribeToTags: PropTypes.func.isRequired,
		tags         : PropTypes.arrayOf(PropTypes.string).isRequired,
		tagOptions   : PropTypes.arrayOf(PropTypes.shape(forbidExtraProps({
			value: PropTypes.string.isRequired,
			label: PropTypes.string.isRequired,
		})).isRequired).isRequired,
		match        : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})).isRequired,
		location     : locationSchema,
		history      : historySchema,
		staticContext: PropTypes.shape(forbidExtraProps({})),
	});

	static initialState = {
		thumbnail               : '',
		renderedMarkdown        : '',
		files                   : [],
		rejectedFiles           : [],
		submissionErrors        : [],
		submissionWarnings      : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		blueprint               : {
			title              : '',
			descriptionMarkdown: '',
			blueprintString    : '',
		},
	};

	static imgurHeaders = {
		'Accept'       : 'application/json',
		'Content-Type' : 'application/json',
		'Authorization': 'Client-ID 46a3f144b6a0882',
	};

	state = Create.initialState;

	componentWillMount()
	{
		this.props.subscribeToTags();
		const localStorageRef = localStorage.getItem('factorio-blueprint-create-form');
		if (localStorageRef)
		{
			const blueprint        = JSON.parse(localStorageRef);
			const renderedMarkdown = marked(blueprint.descriptionMarkdown);
			this.setState({
				renderedMarkdown,
				blueprint,
			});
		}
	}

	componentWillUpdate(nextProps, nextState)
	{
		localStorage.setItem('factorio-blueprint-create-form', JSON.stringify(nextState.blueprint));
	}

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
		this.setState({
			blueprint: {
				...this.state.blueprint,
				[event.target.name]: event.target.value,
			},
		});
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

		if (this.state.files.length !== 1)
		{
			submissionErrors.push('You must attach exactly one screenshot');
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
		if (blueprint.decodedObject == null)
		{
			submissionWarnings.push('Could not parse blueprint.');
			return submissionWarnings;
		}

		if (blueprint.isV14())
		{
			submissionWarnings.push('Blueprint is in 0.14 format. Consider upgrading to the latest version.');
		}

		const v15Decoded = blueprint.getV15Decoded();
		if (!blueprint.isBook() && isEmpty(v15Decoded.blueprint.label))
		{
			submissionWarnings.push('Blueprint has no name. Consider adding a name.');
		}

		if (!blueprint.isBook() && isEmpty(v15Decoded.blueprint.icons))
		{
			submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
		}

		if (blueprint.isBook() && some(v15Decoded.blueprint_book.blueprints, eachBlueprint => isEmpty(eachBlueprint.blueprint.label)))
		{
			submissionWarnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
		}

		return submissionWarnings;
	};

	handleCreateBlueprint = (event) =>
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

		this.actuallyCreateBlueprint();
	};

	handleForceCreateBlueprint = (event) =>
	{
		event.preventDefault();

		const submissionErrors = this.validateInputs();
		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		this.actuallyCreateBlueprint();
	};

	actuallyCreateBlueprint = () =>
	{
		const [file]   = this.state.files;
		const fileName = file.name;

		const fileNameRef = app.storage().ref().child(fileName);
		fileNameRef.getDownloadURL().then(() =>
		{
			this.setState({submissionErrors: [`File with name ${fileName} already exists.`]});
		})
		.catch(() =>
		{
			this.setState({uploadProgressBarVisible: true});
			const uploadTask = fileNameRef.put(file);
			uploadTask.on('state_changed', this.handleUploadProgress, this.handleFirebaseStorageError, () =>
			{
				fetch('https://api.imgur.com/3/upload.json', {
					method : 'POST',
					headers: Create.imgurHeaders,
					body   : file,
				})
					.then(this.processStatus)
					.then(response => response.json())
					.then(({data}) =>
					{
						const image = {
							id        : data.id,
							deletehash: data.deletehash,
							type      : data.type,
							height    : data.height,
							width     : data.width,
						};

						const blueprint = {
							...this.state.blueprint,
							author           : {
								userId     : this.props.user.uid,
							},
							authorId         : this.props.user.uid,
							createdDate      : firebase.database.ServerValue.TIMESTAMP,
							lastUpdatedDate  : firebase.database.ServerValue.TIMESTAMP,
							favorites        : {},
							numberOfFavorites: 0,
							imageUrl         : uploadTask.snapshot.downloadURL,
							fileName,
							image,
						};

						const blueprintSummary = {
							imgurId          : blueprint.image.id,
							imgurType        : blueprint.image.type,
							title            : blueprint.title,
							numberOfFavorites: blueprint.numberOfFavorites,
						};
						const {thumbnail} = this.state;

						const newBlueprintRef = app.database().ref('/blueprints').push(blueprint);
						const updates = {
							[`/users/${this.props.user.uid}/blueprints/${newBlueprintRef.key}`]: true,
							[`/blueprintSummaries/${newBlueprintRef.key}`]                     : blueprintSummary,
							[`/thumbnails/${newBlueprintRef.key}`]                             : thumbnail,
						};
						forEach(blueprint.tags, (tag) =>
							{
								updates[`/byTag/${tag}/${newBlueprintRef.key}`] = true;
							});

						console.log({updates});
						app.database().ref().update(updates)
							.then(() =>
							{
								this.setState(Create.initialState);
								this.props.history.push(`/view/${newBlueprintRef.key}`);
							})
					})
					.catch(this.handleImgurError);
			});
		});
	};

	handleCancel = () =>
	{
		localStorage.removeItem('factorio-blueprint-create-form');
		this.props.history.push('/blueprints');
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
					<p>{'Please log in with Google or GitHub in order to add a Blueprint.'}</p>
				</Jumbotron>
			);
		}

		const handleTagSelection = (selectedTags) =>
		{
			const tags = selectedTags.map(each => each.value);
			this.setState({
				blueprint: {
					...this.state.blueprint,
					tags,
				},
			});
		};

		const blueprint = this.state.blueprint;
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
							<Button bsStyle='danger' onClick={this.handleForceCreateBlueprint}>
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
								<h4>{'Error submitting blueprint'}</h4>
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
							{'Create a new Blueprint'}
						</PageHeader>
					</Row>
					<Row>
						<form className='form-horizontal'>
							<FormGroup controlId='formHorizontalTitle'>
								<Col componentClass={ControlLabel} sm={2} autoFocus>{'Title'}</Col>
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

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Tags'}</Col>
								<Col sm={10}>
									<Select
										value={this.state.blueprint.tags}
										options={this.props.tags.map(value => ({value, label: value}))}
										onChange={handleTagSelection}
										multi
										placeholder='Select at least one tag'
									/>
								</Col>
							</FormGroup>

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Upload screenshot'}</Col>
								<Col sm={10}>
									<div>
										<Dropzone
											accept=' image/*'
											maxSize={10000000}
											className='dropzone'
											onDrop={this.handleDrop}
										>
											<div>{'Drop an image file here, or click to open the file chooser.'}</div>
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
											onClick={this.handleCreateBlueprint}
										>
											<FontAwesome name='floppy-o' size='lg' />
											{' Save'}
										</Button>
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
			</div>);
	}
}

const mapStateToProps = storeState => ({
	user      : selectors.getFilteredUser(storeState),
	tags      : selectors.getTags(storeState),
	tagOptions: selectors.getTagsOptions(storeState),
});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {subscribeToTags};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(Create);
