import {faArrowLeft, faBan, faSave} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}            from '@fortawesome/react-fontawesome';

import {forbidExtraProps}     from 'airbnb-prop-types';
import firebase               from 'firebase/app';
import update                 from 'immutability-helper';
import difference             from 'lodash/difference';
import forEach                from 'lodash/forEach';
import isEmpty                from 'lodash/isEmpty';
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

import {connect}            from 'react-redux';
import Select               from 'react-select';
import {bindActionCreators} from 'redux';

import {subscribeToTags}      from '../actions/actionCreators';
import {app}                  from '../base';
import Blueprint              from '../Blueprint';
import noImageAvailable       from '../gif/No_available_image.gif';
import generateTagSuggestions from '../helpers/generateTagSuggestions';
import * as propTypes         from '../propTypes';
import * as selectors         from '../selectors';

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

class Create extends PureComponent
{
	static propTypes = forbidExtraProps({
		user           : propTypes.userSchema,
		subscribeToTags: PropTypes.func.isRequired,
		tags           : PropTypes.arrayOf(PropTypes.string).isRequired,
		match          : PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({})).isRequired,
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

	static initialState = {
		renderedMarkdown        : '',
		submissionErrors        : [],
		submissionWarnings      : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		blueprint               : {
			title              : '',
			descriptionMarkdown: '',
			blueprintString    : '',
			imageUrl           : '',
		},
	};

	state = Create.initialState;

	UNSAFE_componentWillMount()
	{
		this.props.subscribeToTags();
		const localStorageRef = localStorage.getItem('factorio-blueprint-create-form');
		if (localStorageRef)
		{
			const blueprint = JSON.parse(localStorageRef);
			this.cacheBlueprintState(blueprint);
		}
	}

	UNSAFE_componentWillUpdate(nextProps, nextState)
	{
		localStorage.setItem('factorio-blueprint-create-form', JSON.stringify(nextState.blueprint));
	}

	cacheBlueprintState = (blueprint) =>
	{
		if (blueprint)
		{
			const newBlueprint = {
				...blueprint,
				tags: blueprint.tags || Create.emptyTags,
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

	actuallyCreateBlueprint = async () =>
	{
		const imageUrl = this.state.blueprint.imageUrl;

		const regexCheck    = pattern => imageUrl.match(pattern);
		const regexPatterns = {
			imgurUrl1: /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/,
			imgurUrl2: /^https:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)\.[a-zA-Z0-9]{3,4}$/,
		};

		const matches = Object.values(regexPatterns).map(pattern => regexCheck(pattern)).filter(Boolean);
		if (matches.length <= 0)
		{
			console.log('Create.actuallyCreateBlueprint error in imageUrl', {imageUrl});
			return;
		}

		const match   = matches[0];
		const imgurId = match[1];
		const image   = {
			id  : imgurId,
			type: 'image/png',
		};

		const blueprint = {
			...this.state.blueprint,
			author: {
				userId: this.props.user.uid,
			},
			authorId         : this.props.user.uid,
			createdDate      : firebase.database.ServerValue.TIMESTAMP,
			lastUpdatedDate  : firebase.database.ServerValue.TIMESTAMP,
			favorites        : {},
			numberOfFavorites: 0,
			image,
		};

		const blueprintSummary = {
			imgurId          : blueprint.image.id,
			imgurType        : blueprint.image.type,
			title            : blueprint.title,
			numberOfFavorites: blueprint.numberOfFavorites,
			lastUpdatedDate  : firebase.database.ServerValue.TIMESTAMP,
		};

		try
		{
			const newBlueprintRef = app.database().ref('/blueprints').push(blueprint);

			const updates = {
				[`/users/${this.props.user.uid}/blueprints/${newBlueprintRef.key}`]: true,
				[`/blueprintSummaries/${newBlueprintRef.key}`]                     : blueprintSummary,
				[`/blueprintsPrivate/${newBlueprintRef.key}/imageUrl`]             : imageUrl,
			};
			forEach(blueprint.tags, (tag) =>
			{
				updates[`/byTag/${tag}/${newBlueprintRef.key}`] = true;
			});

			await app.database().ref().update(updates);
			this.setState(Create.initialState);
			this.props.history.push(`/view/${newBlueprintRef.key}`);
		}
		catch (e)
		{
			console.log(e);
			return;
		}
	};

	handleCancel = () =>
	{
		localStorage.removeItem('factorio-blueprint-create-form');
		this.props.history.push('/blueprints');
	};

	parseBlueprint = (blueprintString) =>
	{
		try
		{
			return new Blueprint(blueprintString);
		}
		catch (ignored)
		{
			console.log('Create.parseBlueprint', {ignored});
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

	renderPreview = () =>
	{
		if (!this.state.blueprint.imageUrl)
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
						<Card.Img variant='top' src={this.state.blueprint.imageUrl || noImageAvailable} />
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
				<div className='p-5 rounded-lg jumbotron'>
					<h1 className='display-4'>
						{'Create a Blueprint'}
					</h1>
					<p className='lead'>
						{'Please log in with Google or GitHub in order to add a Blueprint.'}
					</p>
				</div>
			);
		}

		const {blueprint}          = this.state;
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
							<Button variant='danger' type='button' onClick={this.handleForceCreateBlueprint}>
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
									{'Error submitting blueprint'}
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
					<PageHeader title='Create a new Blueprint' />
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
										value={blueprint.blueprintString}
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
										value={this.state.blueprint.tags.map(value => ({value, label: value}))}
										options={this.props.tags.map(value => ({value, label: value}))}
										onChange={this.handleTagSelection}
										isMulti
										placeholder='Select at least one tag'
									/>
								</Col>
							</Form.Group>

							<Form.Group as={Row}>
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

							<Form.Group as={Row}>
								<Col sm={{span: 10, offset: 2}}>
									<ButtonToolbar>
										<Button
											type='button'
											variant='warning'
											size='lg'
											onClick={this.handleCreateBlueprint}
										>
											<FontAwesomeIcon icon={faSave} size='lg' />
											{' Save'}
										</Button>
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
