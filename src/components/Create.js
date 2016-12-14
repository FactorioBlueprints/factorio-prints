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
import Dropzone from 'react-dropzone';
import noImageAvailable from '../gif/No_available_image.gif';
import marked from 'marked';
import base from '../base';
import firebase from 'firebase';

import scaleImage from '../helpers/ImageScaler';

class Create extends Component {
	static propTypes = {
		user: PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string.isRequired,
		}),
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	static initialState = {
		blueprint               : {
			title              : '',
			descriptionMarkdown: '',
			blueprintString    : '',
			thumbnail          : '',
		},
		renderedMarkdown        : '',
		files                   : [],
		rejectedFiles           : [],
		submissionErrors        : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
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
			this.setState({
				blueprint: {
					...this.state.blueprint,
					thumbnail: imageData,
				},
			});
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

	createBlueprint = (event) =>
	{
		event.preventDefault();

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

		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		const storageRef  = base.storage().ref();
		const fileName    = this.state.files[0].name;
		const fileNameRef = storageRef.child(fileName);
		fileNameRef.getDownloadURL().then(() =>
		{
			this.setState({submissionErrors: [`File with name ${fileName} already exists.`]});
		}, () =>
		{
			this.setState({uploadProgressBarVisible: true});
			const uploadTask = fileNameRef.put(this.state.files[0]);
			uploadTask.on('state_changed', (snapshot) =>
			{
				const uploadProgressPercent = Math.trunc(snapshot.bytesTransferred / snapshot.totalBytes * 100);
				this.setState({uploadProgressPercent});
			}, (error) =>
			{
				// Handle unsuccessful uploads
				console.log('Image failed to upload.', {error});
				this.setState({
					submissionErrors        : ['Image failed to upload.'],
					uploadProgressBarVisible: false,
				});
			}, () =>
			{
				// Handle successful uploads on complete
				// For instance, get the download URL: https://firebasestorage.googleapis.com/...
				const blueprint         = {
					...this.state.blueprint,
					author           : this.props.user,
					createdDate      : firebase.database.ServerValue.TIMESTAMP,
					lastUpdatedDate  : firebase.database.ServerValue.TIMESTAMP,
					favorites        : {},
					numberOfFavorites: 0,
					imageUrl         : uploadTask.snapshot.downloadURL,
				};
				const newBlueprintRef   = base.database().ref('/blueprints').push(blueprint);
				const userBlueprintsRef = base.database().ref(`/users/${this.props.user.userId}/blueprints`);
				userBlueprintsRef.update({[newBlueprintRef.key]: true});
				this.setState(Create.initialState);
				this.context.router.transitionTo(`/view/${newBlueprintRef.key}`);
			});
		});
	};

	renderPreview = () =>
	{
		if (!this.state.blueprint.thumbnail)
		{
			return <div>{'Please attach one screenshot.'}</div>;
		}

		return (
			<Col xs={6} md={3}>
				<Thumbnail src={this.state.blueprint.thumbnail || this.state.blueprint.imageUrl || noImageAvailable}>
					<h4 className='truncate'>{this.state.blueprint.title}</h4>
				</Thumbnail>
			</Col>
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
							onSubmit={e => this.createBlueprint(e)}>
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
										{/* // TODO: Style Dropzone using CSS */}
										<Dropzone
											accept=' image/*'
											maxSize={25000000}
											style={{
												padding     : '6px 12px',
												height      : '200px',
												borderWidth : '1px',
												borderStyle : 'dashed',
												borderRadius: '5px',
											}}
											onDrop={this.handleDrop}>
											<div>{'Drop an image file here, or click to open the file chooser.'}</div>
										</Dropzone>
									</div>
								</Col>
							</FormGroup>

							<FormGroup controlId='formHorizontalBlueprint'>
								<Col componentClass={ControlLabel} sm={2}>{'Attached screenshot'}</Col>
								<Col sm={10}>
									<Row>
										{this.renderPreview()}
									</Row>
								</Col>
							</FormGroup>

							<FormGroup>
								<Col smOffset={2} sm={10}>
									<Button type='submit' onClick={this.handleSubmit}>{'Save'}</Button>
								</Col>
							</FormGroup>
						</form>
					</Row>
				</Grid></div>);
	}
}

export default Create;
