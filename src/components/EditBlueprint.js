import firebase from 'firebase';
import marked from 'marked';
import React, {Component, PropTypes} from 'react';
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
import base from '../base';
import noImageAvailable from '../gif/No_available_image.gif';
import NoMatch from './NoMatch';

import scaleImage from '../helpers/ImageScaler';
import buildImageUrl from '../helpers/buildImageUrl';

class EditBlueprint extends Component
{
	static propTypes = {
		id         : PropTypes.string.isRequired,
		isModerator: PropTypes.bool,
		user       : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string,
		}),
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	state = {
		thumbnail               : undefined,
		renderedMarkdown        : '',
		files                   : [],
		rejectedFiles           : [],
		submissionErrors        : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		deletionModalVisible    : false,
		loading                 : true,
	};

	static imgurHeaders = {
		Accept        : 'application/json',
		'Content-Type': 'application/json',
		Authorization : 'Client-ID 46a3f144b6a0882',
	};

	componentWillMount()
	{
		const blueprintRef = base.database().ref(`/blueprints/${this.props.id}`);
		blueprintRef.once('value').then((snapshot) =>
		{
			const blueprint = snapshot.val();
			const renderedMarkdown = blueprint ? marked(blueprint.descriptionMarkdown) : undefined;
			this.setState({
				renderedMarkdown,
				blueprint,
				loading: false,
			});
		}).catch(console.log);
	}

	handleDismissAlert = () =>
	{
		this.setState({rejectedFiles: []});
	};

	handleDismissError = () =>
	{
		this.setState({submissionErrors: []});
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
		const {blueprint} = this.state;
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

	handleSaveBlueprintEdits = (event) =>
	{
		event.preventDefault();

		const submissionErrors = this.validateInputs();

		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		const [file, ]     = this.state.files;
		let imagePromise;
		let uploadTask;
		if (file)
		{
			const fileNameRef = base.storage().ref().child(file.name);
			imagePromise = fileNameRef.getDownloadURL()
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
						link      : data.link,
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
				[`/blueprints/${this.props.id}/lastUpdatedDate`]    : firebase.database.ServerValue.TIMESTAMP,
				[`/blueprints/${this.props.id}/image`]              : image,
				[`/blueprintSummaries/${this.props.id}/title/`]     : this.state.blueprint.title,
				[`/blueprintSummaries/${this.props.id}/imgurId/`]   : image.id,
				[`/blueprintSummaries/${this.props.id}/imgurType/`] : image.type,
			};

			if (file)
			{
				updates[`/blueprints/${this.props.id}/fileName/`]              = file.name;
			}
			if (uploadTask)
			{
				updates[`/blueprints/${this.props.id}/imageUrl/`]              = uploadTask.snapshot.downloadURL;
			}
			if (this.state.thumbnail)
			{
				updates[`/thumbnails/${this.props.id}`] = this.state.thumbnail;
			}

			base.database().ref().update(updates);
		})
			.then(() => this.context.router.transitionTo(`/view/${this.props.id}`))
			.catch(console.log);
		// TODO: Delete old images from storage and imgur
	};

	handleCancel = () =>
	{
		this.context.router.transitionTo('/blueprints');
	};

	handleShowConfirmDelete  = (event) =>
	{
		event.preventDefault();
		this.setState({deletionModalVisible: true});
	};

	handleHideConfirmDelete  = () =>
	{
		this.setState({deletionModalVisible: false});
	};

	handleDeleteBlueprint    = () =>
	{
		base.database().ref().update({
			[`/blueprints/${this.props.id}`]                                : null,
			// TODO: Should be author, not current user
			[`/users/${this.props.user.userId}/blueprints/${this.props.id}`]: null,
			[`/thumbnails/${this.props.id}`]                                : null,
			[`/blueprintSummaries/${this.props.id}`]                        : null,
		})
			.then(() =>
			{
				if (this.state.blueprint.fileName)
				{
					// TODO also delete imgur image
					const fileNameRef = base.storage().ref().child(this.state.blueprint.fileName);
					return fileNameRef.delete();
				}
				return undefined;
			})
			.then(() => this.context.router.transitionTo(`/user/${this.props.user.userId}`))
			.catch(console.log);
	};

	renderOldThumbnail = () =>
	{
		const {id, type} = this.state.blueprint.image;
		const thumbnail          = buildImageUrl(id, type, 'b');

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
					<p>{'Please log in with Google, Facebook, Twitter, or GitHub in order to add a Blueprint.'}</p>
				</Jumbotron>
			);
		}

		if (this.state.loading)
		{
			return <Jumbotron>
				<h1>
					<FontAwesome name='cog' spin />
					{' Loading data'}
				</h1>
			</Jumbotron>;
		}

		const blueprint = this.state.blueprint;
		if (!blueprint)
		{
			return <NoMatch />;
		}

		const ownedByCurrentUser = this.props.user && this.props.user.userId === blueprint.author.userId;
		if (!ownedByCurrentUser && !this.props.isModerator)
		{
			return <Jumbotron><h1>{'You are not the author of this blueprint.'}</h1></Jumbotron>;
		}

		return (
			<div>
				<Modal show={this.state.uploadProgressBarVisible}>
					<Modal.Header>
						<Modal.Title>Image Upload Progress</Modal.Title>
					</Modal.Header>
					<Modal.Body>
						<ProgressBar active now={this.state.uploadProgressPercent} label={`${this.state.uploadProgressPercent}%`} />
					</Modal.Body>
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
						{this.state.rejectedFiles.length > 0 && <Alert
							bsStyle='warning'
							className='alert-fixed'
							onDismiss={this.handleDismissAlert}>
							<h4>{'Error uploading files'}</h4>
							<ul>
								{this.state.rejectedFiles.map(rejectedFile => <li
									key={rejectedFile.name}>{rejectedFile.name}</li>)}
							</ul>
						</Alert>}
						{this.state.submissionErrors.length > 0 && <Alert
							bsStyle='danger'
							className='alert-fixed'
							onDismiss={this.handleDismissError}>
							<h4>{'Error editing blueprint'}</h4>
							<ul>
								{this.state.submissionErrors.map(submissionError => <li
									key={submissionError}>{submissionError}</li>)}
							</ul>
						</Alert>}
					</Row>
					<Row>
						<PageHeader>
							{'Editing: '}{blueprint.title}
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
								<Col componentClass={ControlLabel} sm={2}>{'Description'}</Col>
								<Col sm={10}>
									<FormControl
										componentClass='textarea'
										placeholder='Description (plain text or *markdown*)'
										value={blueprint.descriptionMarkdown}
										onChange={this.handleDescriptionChanged}
									/>
								</Col>
							</FormGroup>

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Description (Preview)'}</Col>
								<Col sm={10}>
									<Panel >
										<div dangerouslySetInnerHTML={{__html: this.state.renderedMarkdown}} />
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

							{this.renderOldThumbnail()}

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Replacement screenshot'}</Col>
								<Col sm={10}>
									<div>
										<Dropzone
											accept=' image/*'
											maxSize={10000000}
											className='dropzone'
											onDrop={this.handleDrop}>
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
											onClick={this.handleSaveBlueprintEdits}
										>
											<FontAwesome name='floppy-o' size='lg' />
											{' Save'}
										</Button>
										{this.props.isModerator &&
										<Button
											bsStyle='danger'
											bsSize='large'
											onClick={this.handleShowConfirmDelete}
										>
											<FontAwesome name='trash-o' size='lg' />
											{' Delete'}
										</Button>}
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
				</Grid></div>);
	}
}

export default EditBlueprint;
