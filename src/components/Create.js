import React, {Component, PropTypes} from 'react';
import Button from 'react-bootstrap/lib/Button';
import Col from 'react-bootstrap/lib/Col';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import Grid from 'react-bootstrap/lib/Grid';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Panel from 'react-bootstrap/lib/Panel';
import Row from 'react-bootstrap/lib/Row';
import Alert from 'react-bootstrap/lib/Alert';
import Thumbnail from 'react-bootstrap/lib/Thumbnail';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import ProgressBar from 'react-bootstrap/lib/ProgressBar';
import Modal from 'react-bootstrap/lib/Modal';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import Dropzone from 'react-dropzone';
import FontAwesome from 'react-fontawesome';
import noImageAvailable from '../gif/No_available_image.gif';
import marked from 'marked';
import base from '../base';
import firebase from 'firebase';

import scaleImage from '../helpers/ImageScaler';

class Create extends Component {
	static propTypes = {
		user: PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string,
		}),
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	static initialState = {
		thumbnail               : '',
		renderedMarkdown        : '',
		files                   : [],
		rejectedFiles           : [],
		submissionErrors        : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		blueprint               : {
			title              : '',
			descriptionMarkdown: '',
			blueprintString    : '',
		},
	};

	static imgurHeaders = {
		Accept        : 'application/json',
		'Content-Type': 'application/json',
		Authorization : 'Client-ID 46a3f144b6a0882',
	};

	state = Create.initialState;

	componentWillMount()
	{
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

	handleCreateBlueprint = (event) =>
	{
		event.preventDefault();

		const submissionErrors = this.validateInputs();

		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		const file     = this.state.files[0];
		const fileName = file.name;

		const fileNameRef = base.storage().ref().child(fileName);
		fileNameRef.getDownloadURL().then(() =>
		{
			this.setState({submissionErrors: [`File with name ${fileName} already exists.`]});
		}, () =>
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
					.then((response) =>
					{
						response.json().then((json) =>
						{
							const data  = json.data;
							const image = {
								id        : data.id,
								link      : data.link,
								deletehash: data.deletehash,
								type      : data.type,
								height    : data.height,
								width     : data.width,
							};

							const blueprint       = {
								...this.state.blueprint,
								author           : this.props.user,
								createdDate      : firebase.database.ServerValue.TIMESTAMP,
								lastUpdatedDate  : firebase.database.ServerValue.TIMESTAMP,
								favorites        : {},
								numberOfFavorites: 0,
								imageUrl         : uploadTask.snapshot.downloadURL,
								fileName,
								image,
							};
							const newBlueprintRef = base.database().ref('/blueprints').push(blueprint);
							base.database().ref(`/users/${this.props.user.userId}/blueprints`).update({[newBlueprintRef.key]: true});

							const thumbnail = this.state.thumbnail;
							newBlueprintRef.then(() =>
							{
								base.database().ref(`/thumbnails/${newBlueprintRef.key}`).set(thumbnail).then(() =>
								{
									this.setState(Create.initialState);
									this.context.router.transitionTo(`/view/${newBlueprintRef.key}`);
								});
							});
						});
					})
					.catch(this.handleImgurError);
			});
		});
	};

	validateInputs = () =>
	{
		const submissionErrors = [];
		if (!this.state.blueprint.title)
		{
			submissionErrors.push('Title may not be empty');
		}
		else if (this.state.blueprint.title.trim().length < 10)
		{
			submissionErrors.push('Title must be at least 10 characters');
		}

		if (!this.state.blueprint.descriptionMarkdown)
		{
			submissionErrors.push('Description Markdown may not be empty');
		}
		else if (this.state.blueprint.descriptionMarkdown.trim().length < 10)
		{
			submissionErrors.push('Description Markdown must be at least 10 characters');
		}

		if (!this.state.blueprint.blueprintString)
		{
			submissionErrors.push('Blueprint String may not be empty');
		}
		else if (this.state.blueprint.blueprintString.trim().length < 10)
		{
			submissionErrors.push('Blueprint String must be at least 10 characters');
		}

		if (this.state.files.length !== 1)
		{
			submissionErrors.push('You must attach exactly one screenshot');
		}
		return submissionErrors;
	}

	handleCancel = () =>
	{
		localStorage.removeItem('factorio-blueprint-create-form');
		this.context.router.transitionTo('/blueprints');
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
		const blueprint = this.state.blueprint;
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
							<h4>{'Error submitting blueprint'}</h4>
							<ul>
								{this.state.submissionErrors.map(submissionError => <li
									key={submissionError}>{submissionError}</li>)}
							</ul>
						</Alert>}
					</Row>
					<Row>
						<PageHeader>{'Create a new Blueprint'}</PageHeader>
					</Row>
					<Row>
						<form
							className='form-horizontal'
							onSubmit={this.handleCreateBlueprint}>
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

							<FormGroup>
								<Col componentClass={ControlLabel} sm={2}>{'Upload screenshot'}</Col>
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
										<Button type='submit' bsStyle='primary'>
											<FontAwesome name='floppy-o' size='lg' />
											{' Save'}
										</Button>
										<Button onClick={this.handleCancel}>
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

export default Create;
