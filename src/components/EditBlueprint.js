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

import NoMatch from './NoMatch';
import marked from 'marked';
import base from '../base';
import firebase from 'firebase';

class EditBlueprint extends Component {
	static propTypes = {
		id       : PropTypes.string.isRequired,
		blueprint: PropTypes.shape({
			title              : PropTypes.string.isRequired,
			author             : PropTypes.shape({
				displayName: PropTypes.string.isRequired,
				userId     : PropTypes.string.isRequired,
			}).isRequired,
			blueprintString    : PropTypes.string.isRequired,
			descriptionMarkdown: PropTypes.string.isRequired,
		}),
		user     : PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string.isRequired,
		}),
	};

	static contextTypes = {router: PropTypes.object.isRequired};

	state = {
		blueprint       : {
			title              : this.props.blueprint.title,
			descriptionMarkdown: this.props.blueprint.descriptionMarkdown,
			blueprintString    : this.props.blueprint.blueprintString,
		},
		renderedMarkdown: marked(this.props.blueprint.descriptionMarkdown),
		submissionErrors: [],
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

	handleChange = (event) =>
	{
		this.setState({
			blueprint: {
				...this.state.blueprint,
				[event.target.name]: event.target.value,
			},
		});
	};

	editBlueprint = (event) =>
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

		if (submissionErrors.length > 0)
		{
			this.setState({submissionErrors});
			return;
		}

		const blueprint = {
			...this.state.blueprint,
			lastUpdatedDate: firebase.database.ServerValue.TIMESTAMP,
		};

		base.database().ref(`/blueprints/${this.props.id}/`).update(blueprint);
		this.context.router.transitionTo(`/view/${this.props.id}`);
	};

	render()
	{
		if (!this.props.blueprint)
		{
			return <NoMatch />;
		}

		const ownedByCurrentUser = this.props.user && this.props.user.userId === this.props.blueprint.author.userId;

		if (!ownedByCurrentUser)
		{
			return <Jumbotron><h1>{'You are not the author of this blueprint.'}</h1></Jumbotron>;
		}

		const blueprint = this.state.blueprint;

		return <Grid>
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
					{'Editing: '}{this.props.blueprint.title}
				</PageHeader>
			</Row>
			<Row>
				<form
					className='form-horizontal'
					onSubmit={e => this.editBlueprint(e)}>
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
							<Button type='submit' onClick={this.handleSubmit}>{'Save'}</Button>
						</Col>
					</FormGroup>
				</form>
			</Row>
		</Grid>;
	}
}

export default EditBlueprint;
