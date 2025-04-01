import {faArrowLeft, faBan, faSave} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}            from '@fortawesome/react-fontawesome';

import {getAuth}                                 from 'firebase/auth';
import update                                    from 'immutability-helper';
import difference                                from 'lodash/difference';
import isEmpty                                   from 'lodash/isEmpty';
import some                                      from 'lodash/some';
import MarkdownIt                                  from 'markdown-it';
import DOMPurify              from 'dompurify';
// No PropTypes needed
import React, {useCallback, useEffect, useState} from 'react';
import { loadFromStorage, saveToStorage, removeFromStorage, STORAGE_KEYS } from '../localStorage';
import Alert                                     from 'react-bootstrap/Alert';
import Button                                    from 'react-bootstrap/Button';
import ButtonToolbar                             from 'react-bootstrap/ButtonToolbar';
import Card                                      from 'react-bootstrap/Card';
import Col                                       from 'react-bootstrap/Col';
import Container                                 from 'react-bootstrap/Container';
import Form                                      from 'react-bootstrap/Form';
import FormControl                               from 'react-bootstrap/FormControl';
import Modal                                     from 'react-bootstrap/Modal';
import ProgressBar                               from 'react-bootstrap/ProgressBar';
import Row                                       from 'react-bootstrap/Row';
import {useAuthState}                            from 'react-firebase-hooks/auth';
import {useNavigate}                             from '@tanstack/react-router';
import Select                                    from 'react-select';

import {app}                  from '../base';
import Blueprint              from '../Blueprint';
import noImageAvailable       from '../gif/No_available_image.gif';
import generateTagSuggestions from '../helpers/generateTagSuggestions';
import {useCreateBlueprint}   from '../hooks/useCreateBlueprint';
import {useTags}              from '../hooks/useTags';
// No PropTypes needed

import PageHeader          from './PageHeader';
import TagSuggestionButton from './TagSuggestionButton';

// Initialize markdown-it
const md = new MarkdownIt({
	html       : true,
	linkify    : true,
	typographer: true,
	breaks     : false,
});

const defaultTableRenderer = md.renderer.rules.table_open || function(tokens, idx, options, env, self)
{
	return self.renderToken(tokens, idx, options);
};

md.renderer.rules.table_open = function(tokens, idx, options, env, self)
{
	tokens[idx].attrSet('class', 'table table-striped table-bordered');
	return defaultTableRenderer(tokens, idx, options, env, self);
};

const emptyTags = [];

const initialState = {
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

const Create = () =>
{
	const [user] = useAuthState(getAuth(app));
	const navigate = useNavigate();
	const [state, setState] = useState(initialState);
	const [parsedBlueprint, setParsedBlueprint] = useState(null);
	const [v15Decoded, setV15Decoded] = useState(null);

	// Get all tags using the query hook
	const { data: tagsData, isLoading: tagsLoading } = useTags();
	const tags = tagsData?.tags || [];

	// Create blueprint mutation
	const createBlueprintMutation = useCreateBlueprint();

	const parseBlueprint = useCallback((blueprintString) =>
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
	}, []);

	const cacheBlueprintState = useCallback((blueprint) =>
	{
		if (blueprint)
		{
			const newBlueprint = {
				...blueprint,
				tags: blueprint.tags || emptyTags,
			};

			const renderedMarkdown = DOMPurify.sanitize(md.render(blueprint.descriptionMarkdown || ''));
			const parsedBp = parseBlueprint(blueprint.blueprintString);
			const decoded = parsedBp ? parsedBp.getV15Decoded() : null;

			setState(prevState => ({
				...prevState,
				blueprint: newBlueprint,
				renderedMarkdown,
			}));

			setParsedBlueprint(parsedBp);
			setV15Decoded(decoded);
		}
	}, [parseBlueprint]);

	useEffect(() =>
	{
		const blueprint = loadFromStorage(STORAGE_KEYS.CREATE_FORM);
		if (blueprint)
		{
			cacheBlueprintState(blueprint);
		}
	}, [cacheBlueprintState]);

	useEffect(() =>
	{
		saveToStorage(STORAGE_KEYS.CREATE_FORM, state.blueprint);
	}, [state.blueprint]);

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
		const renderedMarkdown = DOMPurify.sanitize(md.render(descriptionMarkdown || ''));
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
			const newV15Decoded = newParsedBlueprint ? newParsedBlueprint.getV15Decoded() : null;

			setParsedBlueprint(newParsedBlueprint);
			setV15Decoded(newV15Decoded);
		}

		setState(prevState => ({
			...prevState,
			blueprint: {
				...prevState.blueprint,
				[name]: value,
			},
		}));
	}, [parseBlueprint]);

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

		if (blueprint.isBlueprint() && v15Decoded && isEmpty(v15Decoded.blueprint.label))
		{
			submissionWarnings.push('Blueprint has no name. Consider adding a name.');
		}
		if (blueprint.isBlueprint() && v15Decoded && isEmpty(v15Decoded.blueprint.icons))
		{
			submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
		}

		if (blueprint.isBook() && v15Decoded && someHaveNoName(v15Decoded.blueprint_book))
		{
			submissionWarnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
		}

		return submissionWarnings;
	}, [state.blueprint, v15Decoded, someHaveNoName]);

	const handleCreateBlueprint = useCallback((event) =>
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

		// Use mutation hook with raw data
		createBlueprintMutation.mutate({
			formData: state.blueprint,
			user,
		}, {
			onSuccess: () =>
			{
				setState(initialState);
				removeFromStorage(STORAGE_KEYS.CREATE_FORM);
			},
		});
	}, [validateInputs, validateWarnings, createBlueprintMutation, state.blueprint, user]);

	const handleForceCreateBlueprint = useCallback((event) =>
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

		// Use mutation hook with raw data (force)
		createBlueprintMutation.mutate({
			formData: state.blueprint,
			user,
		}, {
			onSuccess: () =>
			{
				setState(initialState);
				removeFromStorage(STORAGE_KEYS.CREATE_FORM);
			},
		});
	}, [validateInputs, createBlueprintMutation, state.blueprint, user]);

	const handleCancel = useCallback(() =>
	{
		removeFromStorage('factorio-blueprint-create-form');
		navigate({ to: '/blueprints' });
	}, [navigate]);

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
		setState(prevState => update(prevState, {
			blueprint: {tags: {$push: [tag]}},
		}));
	}, []);

	const renderPreview = useCallback(() =>
	{
		if (!state.blueprint.imageUrl)
		{
			return <div />;
		}

		return (
			<Form.Group as={Row} className='mb-3'>
				<Form.Label column sm='2'>
					{'Attached screenshot'}
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img
							variant='top'
							src={state.blueprint.imageUrl || noImageAvailable}
							onError={(e) =>
							{
								e.target.src = noImageAvailable;
							}}
						/>
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

	const {blueprint} = state;
	const allTagSuggestions = generateTagSuggestions(
		state.blueprint.title,
		parsedBlueprint,
		v15Decoded,
	);
	const unusedTagSuggestions = difference(allTagSuggestions, state.blueprint.tags || []);

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
						<Button variant='danger' type='button' onClick={handleForceCreateBlueprint} disabled={createBlueprintMutation.isPending}>
							<FontAwesomeIcon icon={faSave} size='lg' />
							{createBlueprintMutation.isPending ? ' Saving...' : ' Save'}
						</Button>
						<Button variant='primary' type='button' onClick={handleDismissWarnings} disabled={createBlueprintMutation.isPending}>
							<FontAwesomeIcon icon={faArrowLeft} size='lg' />
							{' Go back'}
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
								{'Error submitting blueprint'}
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
					{
						createBlueprintMutation.isError && <Alert
							variant='danger'
							className='alert-fixed'
							dismissible
							onClose={() => createBlueprintMutation.reset()}
						>
							<h4>
								{'Error creating blueprint'}
							</h4>
							<p>{createBlueprintMutation.error?.message || 'An unknown error occurred'}</p>
							{createBlueprintMutation.error && (
								<div className='mt-2'>
									<details>
										<summary>Error Details</summary>
										<pre className='mt-2 p-2 bg-dark text-light rounded'>
											{JSON.stringify(createBlueprintMutation.error, null, 2)}
										</pre>
									</details>
								</div>
							)}
						</Alert>
					}
				</Row>
				<PageHeader title='Create a new Blueprint' />
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
										style={{minHeight: 200, padding: '1rem'}}
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
									value={(state.blueprint.tags || []).map(value => ({value, label: value}))}
									options={tags.map(value => ({value, label: value}))}
									onChange={handleTagSelection}
									isMulti
									placeholder='Select at least one tag'
									isLoading={tagsLoading}
								/>
							</Col>
						</Form.Group>

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
										onClick={handleCreateBlueprint}
										disabled={createBlueprintMutation.isPending}
									>
										<FontAwesomeIcon icon={faSave} size='lg' />
										{createBlueprintMutation.isPending ? ' Saving...' : ' Save'}
									</Button>
									<Button
										type='button'
										size='lg'
										onClick={handleCancel}
										disabled={createBlueprintMutation.isPending}
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

// No longer need propTypes since we use TanStack Router's useNavigate

export default Create;
