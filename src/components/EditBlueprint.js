import {faArrowLeft, faBan, faCog, faSave, faTrash} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}                            from '@fortawesome/react-fontawesome';

import {forbidExtraProps}                         from 'airbnb-prop-types';
import {ref, serverTimestamp, update as dbUpdate} from 'firebase/database';
import update                 from 'immutability-helper';
import difference                                 from 'lodash/difference';
import forEach                                    from 'lodash/forEach';
import isEmpty                                    from 'lodash/isEmpty';
import some                                       from 'lodash/some';
import {marked}                                   from 'marked';
import PropTypes                                  from 'prop-types';
import React, {useCallback, useEffect, useState}  from 'react';
import Alert                                      from 'react-bootstrap/Alert';
import Button                                     from 'react-bootstrap/Button';
import ButtonToolbar                              from 'react-bootstrap/ButtonToolbar';
import Card                                       from 'react-bootstrap/Card';
import Col                                        from 'react-bootstrap/Col';
import Container                                  from 'react-bootstrap/Container';
import Form                                       from 'react-bootstrap/Form';
import FormControl                                from 'react-bootstrap/FormControl';
import Modal                                      from 'react-bootstrap/Modal';
import ProgressBar                                from 'react-bootstrap/ProgressBar';
import Row                                        from 'react-bootstrap/Row';
import {connect}                                  from 'react-redux';
import {useLocation, useNavigate, useParams}      from 'react-router-dom';
import Select                                     from 'react-select';
import {bindActionCreators}                       from 'redux';

import {subscribeToBlueprint, subscribeToModerators, subscribeToTags} from '../actions/actionCreators';

import {database}             from '../base';
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

marked.use({
	renderer,
	gfm       : true,
	tables    : true,
	breaks    : false,
	pedantic  : false,
	sanitize  : false,
	smartLists: true,
	mangle    : false,
	headerIds : false,
});

const emptyTags = [];

const imgurHeaders = {
	'Accept'       : 'application/json',
	'Content-Type' : 'application/json',
	'Authorization': 'Client-ID 46a3f144b6a0882',
};

const EditBlueprint = ({
	id,
	user,
	subscribeToBlueprint,
	subscribeToModerators,
	subscribeToTags,
	tags,
	isModerator,
	blueprint: propBlueprint,
	loading,
	match,
	location,
	history,
	staticContext,
}) =>
{
	const [state, setState] = useState({
		renderedMarkdown        : '',
		submissionErrors        : [],
		submissionWarnings      : [],
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		deletionModalVisible    : false,
		blueprint               : null,
		parsedBlueprint         : null,
		v15Decoded              : null,
	});

	const parseBlueprint = useCallback((blueprintString) =>
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
	}, []);

	const cacheBlueprintState = useCallback((blueprint) =>
	{
		if (blueprint)
		{
			const imgurId = blueprint.image && blueprint.image.id;
			const imgurType = blueprint.image && blueprint.image.type;

			const newBlueprint = {
				...blueprint,
				tags    : blueprint.tags || emptyTags,
				imageUrl: imgurId ? `https://imgur.com/${imgurId}` : '',
			};

			const renderedMarkdown = marked(blueprint.descriptionMarkdown);
			const parsedBlueprint = parseBlueprint(blueprint.blueprintString);
			const v15Decoded = parsedBlueprint && parsedBlueprint.getV15Decoded();

			setState(prevState => ({
				...prevState,
				blueprint: newBlueprint,
				renderedMarkdown,
				parsedBlueprint,
				v15Decoded,
			}));
		}
	}, [parseBlueprint]);

	useEffect(() =>
	{
		subscribeToBlueprint(id);
		subscribeToTags();
		if (!isEmpty(user))
		{
			subscribeToModerators();
		}

		cacheBlueprintState(propBlueprint);
	}, [id, subscribeToBlueprint, subscribeToTags, subscribeToModerators, user, propBlueprint, cacheBlueprintState]);

	useEffect(() =>
	{
		if (propBlueprint)
		{
			cacheBlueprintState(propBlueprint);
		}
	}, [propBlueprint, cacheBlueprintState]);

	const handleDismissError = useCallback(() =>
	{
		setState(prevState => ({
			...prevState,
			submissionErrors: [],
		}));
	}, []);

	const handleDismissWarnings = useCallback(() =>
	{
		setState(prevState => ({
			...prevState,
			submissionWarnings: [],
		}));
	}, []);

	const handleDescriptionChanged = useCallback((event) =>
	{
		const descriptionMarkdown = event.target.value;
		const renderedMarkdown = marked(descriptionMarkdown);
		setState(prevState => ({
			...prevState,
			renderedMarkdown,
			blueprint: {
				...prevState.blueprint,
				descriptionMarkdown,
			},
		}));
	}, []);

	const handleChange = useCallback((event) =>
	{
		const {name, value} = event.target;

		if (name === 'blueprintString')
		{
			const newParsedBlueprint = parseBlueprint(value);
			const newV15Decoded = newParsedBlueprint && newParsedBlueprint.getV15Decoded();

			setState(prevState => ({
				...prevState,
				parsedBlueprint: newParsedBlueprint,
				v15Decoded     : newV15Decoded,
				blueprint      : {
					...prevState.blueprint,
					[name]: value,
				},
			}));
		}
		else
		{
			setState(prevState => ({
				...prevState,
				blueprint: {
					...prevState.blueprint,
					[name]: value,
				},
			}));
		}
	}, [parseBlueprint]);

	const processStatus = useCallback((response) =>
	{
		if (response.status === 200 || response.status === 0)
		{
			return Promise.resolve(response);
		}
		return Promise.reject(new Error(response.statusText));
	}, []);

	const handleImgurError = useCallback((error) =>
	{
		console.error(error.message ? error.message : error);
	}, []);

	const handleFirebaseStorageError = useCallback((error) =>
	{
		console.error('Image failed to upload.', {error});
		setState(prevState => ({
			...prevState,
			submissionErrors        : ['Image failed to upload.'],
			uploadProgressBarVisible: false,
		}));
	}, []);

	const handleUploadProgress = useCallback((snapshot) =>
	{
		const uploadProgressPercent = Math.trunc(snapshot.bytesTransferred / snapshot.totalBytes * 100);
		setState(prevState => ({
			...prevState,
			uploadProgressPercent,
		}));
	}, []);

	const someHaveNoName = useCallback((blueprintBook) =>
	{
		return some(
			blueprintBook.blueprints,
			(eachEntry) =>
			{
				if (eachEntry.blueprint_book) return someHaveNoName(eachEntry.blueprint_book);
				if (eachEntry.blueprint) return isEmpty(eachEntry.blueprint.label);
				return false;
			});
	}, []);

	const validateInputs = useCallback(() =>
	{
		const submissionErrors = [];
		const {blueprint} = state;
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
	}, [state]);

	const validateWarnings = useCallback(() =>
	{
		const submissionWarnings = [];

		if (isEmpty(state.blueprint.tags))
		{
			submissionWarnings.push('The blueprint has no tags. Consider adding a few tags.');
		}

		const blueprint = new Blueprint(state.blueprint.blueprintString.trim());
		if (isEmpty(blueprint.decodedObject))
		{
			submissionWarnings.push('Could not parse blueprint.');
			return submissionWarnings;
		}

		if (blueprint.isV14())
		{
			submissionWarnings.push('Blueprint is in 0.14 format. Consider upgrading to the latest version.');
		}

		if (blueprint.isBlueprint() && state.v15Decoded && isEmpty(state.v15Decoded.blueprint.label))
		{
			submissionWarnings.push('Blueprint has no name. Consider adding a name.');
		}
		if (blueprint.isBlueprint() && state.v15Decoded && isEmpty(state.v15Decoded.blueprint.icons))
		{
			submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
		}

		if (blueprint.isBook() && state.v15Decoded && someHaveNoName(state.v15Decoded.blueprint_book))
		{
			submissionWarnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
		}

		return submissionWarnings;
	}, [state.blueprint, state.v15Decoded, someHaveNoName]);

	const actuallySaveBlueprintEdits = useCallback(async () =>
	{
		const imageUrl = state.blueprint.imageUrl;

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
		const image = {
			id  : imgurId,
			type: 'image/png',
		};

		const currentImageId = propBlueprint.image && propBlueprint.image.id;
		const currentImageType = propBlueprint.image && propBlueprint.image.type;
		const shouldUpdateImage = imgurId !== currentImageId || !state.blueprint.imageUrl.includes(currentImageId);

		const updates = {
			[`/blueprints/${id}/title`]                   : state.blueprint.title,
			[`/blueprints/${id}/blueprintString`]         : state.blueprint.blueprintString,
			[`/blueprints/${id}/descriptionMarkdown`]     : state.blueprint.descriptionMarkdown,
			[`/blueprints/${id}/tags`]                    : state.blueprint.tags,
			[`/blueprints/${id}/lastUpdatedDate`]         : serverTimestamp(),
			[`/blueprintSummaries/${id}/title/`]          : state.blueprint.title,
			[`/blueprintSummaries/${id}/lastUpdatedDate/`]: serverTimestamp(),
		};

		if (shouldUpdateImage)
		{
			updates[`/blueprints/${id}/image`] = image;
			updates[`/blueprintSummaries/${id}/imgurId/`] = image.id;
			updates[`/blueprintSummaries/${id}/imgurType/`] = image.type;
		}

		tags.forEach((tag) =>
		{
			updates[`/byTag/${tag}/${id}`] = null;
		});
		forEach(state.blueprint.tags, (tag) =>
		{
			updates[`/byTag/${tag}/${id}`] = true;
		});

		try
		{
			await dbUpdate(ref(database), updates);
			history.push(`/view/${id}`);
		}
		catch (e)
		{
			console.log(e);
			return;
		}
	}, [state.blueprint, propBlueprint, id, history, tags]);

	const handleSaveBlueprintEdits = useCallback((event) =>
	{
		event.preventDefault();

		const submissionErrors = validateInputs();

		if (submissionErrors.length > 0)
		{
			setState(prevState => ({
				...prevState,
				submissionErrors,
			}));
			return;
		}

		const submissionWarnings = validateWarnings();
		if (submissionWarnings.length > 0)
		{
			setState(prevState => ({
				...prevState,
				submissionWarnings,
			}));
			return;
		}

		actuallySaveBlueprintEdits();
	}, [validateInputs, validateWarnings, actuallySaveBlueprintEdits]);

	const handleForceSaveBlueprintEdits = useCallback((event) =>
	{
		event.preventDefault();

		const submissionErrors = validateInputs();
		if (submissionErrors.length > 0)
		{
			setState(prevState => ({
				...prevState,
				submissionErrors,
			}));
			return;
		}

		actuallySaveBlueprintEdits();
	}, [validateInputs, actuallySaveBlueprintEdits]);

	const handleCancel = useCallback(() =>
	{
		history.push(`/view/${id}`);
	}, [history, id]);

	const handleShowConfirmDelete = useCallback((event) =>
	{
		event.preventDefault();
		setState(prevState => ({
			...prevState,
			deletionModalVisible: true,
		}));
	}, []);

	const handleHideConfirmDelete = useCallback(() =>
	{
		setState(prevState => ({
			...prevState,
			deletionModalVisible: false,
		}));
	}, []);

	const handleDeleteBlueprint = useCallback(() =>
	{
		const authorId = state.blueprint.author.userId;
		const updates = {
			[`/blueprints/${id}`]                  : null,
			[`/users/${authorId}/blueprints/${id}`]: null,
			[`/blueprintSummaries/${id}`]          : null,
		};
		tags.forEach((tag) =>
		{
			updates[`/byTag/${tag}/${id}`] = null;
		});

		dbUpdate(ref(database), updates)
			.then(() => history.push(`/user/${authorId}`));
	}, [state.blueprint, id, history, tags]);

	const handleTagSelection = useCallback((selectedTags) =>
	{
		const tags = selectedTags.map(each => each.value);
		setState(prevState => ({
			...prevState,
			blueprint: {
				...prevState.blueprint,
				tags,
			},
		}));
	}, []);

	const addTag = useCallback((tag) =>
	{
		setState(prevState =>
			update(prevState, {
				blueprint: {tags: {$push: [tag]}},
			}),
		);
	}, []);

	const renderOldThumbnail = useCallback(() =>
	{
		if (!state.blueprint || !state.blueprint.image)
		{
			return null;
		}

		const {id, type} = state.blueprint.image;
		const imageUrl = buildImageUrl(id, type, 'b');

		return (
			<Form.Group as={Row} className='mb-3'>
				<Form.Label column sm='2'>
					{'Old screenshot'}
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img variant='top' src={imageUrl || noImageAvailable} />
						<Card.Title className='truncate'>
							{state.blueprint.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	}, [state.blueprint]);

	const renderPreview = useCallback(() =>
	{
		if (!state.blueprint || !state.blueprint.imageUrl)
		{
			return null;
		}

		const goodRegex1 = /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/;
		const match = state.blueprint.imageUrl.match(goodRegex1);
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

		const imgurId = match[1];
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
							{state.blueprint.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	}, [state.blueprint]);

	if (!user)
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

	if (loading)
	{
		return (
			<h1>
				<FontAwesomeIcon icon={faCog} spin />
				{' Loading data'}
			</h1>
		);
	}

	const {blueprint} = state;
	if (!blueprint)
	{
		return <NoMatch />;
	}

	const ownedByCurrentUser = user && user.uid === blueprint.author.userId;
	if (!ownedByCurrentUser && !isModerator)
	{
		return (
			<h1>
				You are not the author of this blueprint.
			</h1>
		);
	}

	const allTagSuggestions = generateTagSuggestions(
		blueprint.title,
		state.parsedBlueprint,
		state.v15Decoded,
	);
	const unusedTagSuggestions = difference(allTagSuggestions, blueprint.tags);

	return (
		<>
			<Modal show={state.uploadProgressBarVisible}>
				<Modal.Header>
					<Modal.Title>
						Image Upload Progress
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<ProgressBar
						now={state.uploadProgressPercent}
						label={`${state.uploadProgressPercent}%`}
						variant='warning'
						className='text-light'
					/>
				</Modal.Body>
			</Modal>
			<Modal show={!isEmpty(state.submissionWarnings)}>
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
							state.submissionWarnings.map(submissionWarning => (
								<li key={submissionWarning}>
									{submissionWarning}
								</li>
							))
						}
					</ul>
				</Modal.Body>
				<Modal.Footer>
					<ButtonToolbar>
						<Button variant='danger' type='button' onClick={handleForceSaveBlueprintEdits}>
							<FontAwesomeIcon icon={faSave} size='lg' />
							{' Save'}
						</Button>
						<Button variant='primary' type='button' onClick={handleDismissWarnings}>
							<FontAwesomeIcon icon={faArrowLeft} size='lg' />
							{' Go back'}
						</Button>
					</ButtonToolbar>
				</Modal.Footer>
			</Modal>
			<Modal show={state.deletionModalVisible} onHide={handleHideConfirmDelete}>
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
						<Button variant='danger' type='button' onClick={handleDeleteBlueprint}>
							Delete
						</Button>
						<Button onClick={handleHideConfirmDelete}>
							Cancel
						</Button>
					</ButtonToolbar>
				</Modal.Footer>
			</Modal>
			<Container>
				<Row>
					{
						state.submissionErrors.length > 0 && <Alert
							variant='danger'
							className='alert-fixed'
							dismissible
							onClose={handleDismissError}
						>
							<h4>
								{'Error editing blueprint'}
							</h4>
							<ul>
								{
									state.submissionErrors.map(submissionError => (
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
									onChange={handleChange}
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
									onChange={handleDescriptionChanged}
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
										dangerouslySetInnerHTML={{__html: state.renderedMarkdown}}
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
									onChange={handleChange}
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
													addTag={addTag}
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
									value={blueprint.tags.map(value => ({value, label: value}))}
									options={tags.map(value => ({value, label: value}))}
									onChange={handleTagSelection}
									isMulti
									placeholder='Select at least one tag'
								/>
							</Col>
						</Form.Group>

						{renderOldThumbnail()}

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
									onChange={handleChange}
								/>
							</Col>
						</Form.Group>

						{renderPreview()}

						<Form.Group as={Row} className='mb-3'>
							<Col sm={{span: 10, offset: 2}}>
								<ButtonToolbar>
									<Button
										type='button'
										variant='warning'
										size='lg'
										onClick={handleSaveBlueprintEdits}
									>
										<FontAwesomeIcon icon={faSave} size='lg' />
										{' Save'}
									</Button>
									{
										isModerator && <Button
											variant='danger'
											size='lg'
											onClick={handleShowConfirmDelete}
										>
											<FontAwesomeIcon icon={faTrash} size='lg' />
											{' Delete'}
										</Button>
									}
									<Button
										type='button'
										size='lg'
										onClick={handleCancel}
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
};

EditBlueprint.propTypes = forbidExtraProps({
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

// Wrapper to provide router props to functional component
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
