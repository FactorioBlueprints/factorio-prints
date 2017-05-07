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
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import ButtonToolbar from 'react-bootstrap/lib/ButtonToolbar';
import Modal from 'react-bootstrap/lib/Modal';
import FontAwesome from 'react-fontawesome';
import NoMatch from './NoMatch';
import marked from 'marked';
import base from '../base';
import firebase from 'firebase';

class EditBlueprint extends Component
{
	static propTypes = {
		id         : PropTypes.string.isRequired,
		user       : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string.isRequired,
		}),
		isModerator: PropTypes.bool,
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	state = {
		renderedMarkdown    : '',
		submissionErrors    : [],
		deletionModalVisible: false,
		loading             : true,
	};

	componentWillMount()
	{
		const blueprintRef = base.database().ref(`/blueprints/${this.props.id}`);
		blueprintRef.once('value').then((snapshot) =>
		{
			const blueprint = snapshot.val();
			this.setState({
				blueprint,
				loading: false,
			});
		});
	}

	handleDismissError       = () =>
	{
		this.setState({submissionErrors: []});
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
			[`/users/${this.state.blueprint.author.userId}/blueprints/${this.props.id}`]: null,
			[`/thumbnails/${this.props.id}`]                                : null,
			[`/blueprintSummaries/${this.props.id}`]                        : null,
		})
			.then(() =>
			{
				if (this.state.blueprint.fileName)
				{
					const fileNameRef = base.storage().ref().child(this.state.blueprint.fileName);
					return fileNameRef.delete();
				}
				return undefined;
			})
			.then(() => this.context.router.transitionTo(`/user/${this.props.user.userId}`))
			.catch(console.log);
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
	handleChange             = (event) =>
	{
		this.setState({
			blueprint: {
				...this.state.blueprint,
				[event.target.name]: event.target.value,
			},
		});
	};
	handleSaveBlueprintEdits = (event) =>
	{
		event.preventDefault();

		const submissionErrors = [];
		const blueprint        = this.state.blueprint;
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

		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		const updatedBlueprint = {
			...blueprint,
			lastUpdatedDate: firebase.database.ServerValue.TIMESTAMP,
		};
		delete updatedBlueprint.favorites;
		delete updatedBlueprint.author;

		base.database().ref(`/blueprints/${this.props.id}/`).update(updatedBlueprint);

		const blueprintSummary = {
			imgurId          : blueprint.image.id,
			imgurType        : blueprint.image.type,
			title            : blueprint.title,
			numberOfFavorites: blueprint.numberOfFavorites,
		};

		base.database().ref(`/blueprintSummaries/${this.props.id}/`).update(blueprintSummary);
		this.context.router.transitionTo(`/view/${this.props.id}`);
	};

	render()
	{
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

		return <Grid>
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
			<Row>
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
				<form
					className='form-horizontal'
					onSubmit={this.handleSaveBlueprintEdits}>
					<FormGroup controlId='formHorizontalTitle'>
						<Col componentClass={ControlLabel} sm={2} autoFocus>{'Title'}</Col>
						<Col sm={10}>
							<FormControl
								type='text'
								name='title'
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
								value={blueprint.blueprintString}
								className='blueprintString'
								onChange={this.handleChange}
							/>
						</Col>
					</FormGroup>

					<FormGroup>
						<Col smOffset={2} sm={10}>
							<ButtonToolbar>
								<Button
									bsStyle='primary'
									bsSize='large'
									type='submit'
									onClick={this.handleSaveBlueprintEdits}>
									<FontAwesome name='floppy-o' size='lg' />{' Save'}
								</Button>
								{this.props.isModerator &&
								<Button
									bsStyle='danger'
									bsSize='large'
									type='submit'
									onClick={this.handleShowConfirmDelete}>
									<FontAwesome name='trash-o' size='lg' />{' Delete'}
								</Button>}
							</ButtonToolbar>
						</Col>
					</FormGroup>
				</form>
			</Row>
		</Grid>;
	}
}

export default EditBlueprint;
