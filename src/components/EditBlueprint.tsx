import {faArrowLeft, faBan, faCog, faSave, faTrash} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}                            from '@fortawesome/react-fontawesome';

import {getAuth}                                          from 'firebase/auth';
import isEmpty                                            from 'lodash/isEmpty';
import some                                               from 'lodash/some';
import MarkdownIt                                         from 'markdown-it';
import DOMPurify                                          from 'dompurify';
import React, {useCallback, useEffect, useState, useMemo} from 'react';
import Alert                                              from 'react-bootstrap/Alert';
import Button                                             from 'react-bootstrap/Button';
import ButtonToolbar                                      from 'react-bootstrap/ButtonToolbar';
import Card                                               from 'react-bootstrap/Card';
import Col                                                from 'react-bootstrap/Col';
import Container                                          from 'react-bootstrap/Container';
import Form                                               from 'react-bootstrap/Form';
import FormControl                                        from 'react-bootstrap/FormControl';
import Modal                                              from 'react-bootstrap/Modal';
import ProgressBar                                        from 'react-bootstrap/ProgressBar';
import Row                                                from 'react-bootstrap/Row';
import {useAuthState}                                     from 'react-firebase-hooks/auth';
import {useNavigate, useParams}                           from '@tanstack/react-router';
import Select                                             from 'react-select';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import {app}                                    from '../base';
import Blueprint, { type V15DecodedObject, type ConvertedBlueprint } from '../Blueprint';
import noImageAvailable                         from '../gif/No_available_image.gif';
import buildImageUrl                            from '../helpers/buildImageUrl';
import generateTagSuggestions                   from '../helpers/generateTagSuggestions';
import {sanitizeHtml}                           from '../helpers/sanitizeHtml';
import {useIsModerator}                         from '../hooks/useModerators';
import {useTags}                                from '../hooks/useTags';
import {useDeleteBlueprint, useUpdateBlueprint} from '../hooks/useUpdateBlueprint';
import {useEnrichedBlueprint}                   from '../hooks/useEnrichedBlueprint';
import {useRawBlueprint}                        from '../hooks/useRawBlueprint';
import {useEnrichedBlueprintSummary}            from '../hooks/useEnrichedBlueprintSummary';
import type { BlueprintBook } from '../schemas';

import NoMatch             from './NoMatch';
import PageHeader          from './PageHeader';
import TagSuggestionButton from './TagSuggestionButton';

const md = new MarkdownIt({
	html       : true,
	linkify    : true,
	typographer: true,
	breaks     : false,
});

const defaultTableRenderer = md.renderer.rules.table_open || function(tokens: any[], idx: number, options: any, env: any, self: any)
{
	return self.renderToken(tokens, idx, options);
};

md.renderer.rules.table_open = function(tokens: any[], idx: number, options: any, env: any, self: any)
{
	tokens[idx].attrSet('class', 'table table-striped table-bordered');
	return defaultTableRenderer(tokens, idx, options, env, self);
};

const emptyTags: string[] = [];

const blueprintFormSchema = z.object({
	title: z.string()
		.min(10, 'Title must be at least 10 characters'),
	descriptionMarkdown: z.string()
		.min(10, 'Description must be at least 10 characters'),
	blueprintString: z.string()
		.min(10, 'Blueprint String must be at least 10 characters'),
	imageUrl: z.string()
		.refine(
			(url) =>
			{
				if (!url) return true;
				const goodRegex1 = /^https:\/\/i\.imgur\.com\/[a-zA-Z0-9]+\.[a-zA-Z0-9]{3,4}$/;
				const goodRegex2 = /^https:\/\/imgur\.com\/[a-zA-Z0-9]+$/;
				const badRegex = /^https:\/\/imgur\.com\/(a|gallery)\/[a-zA-Z0-9]+$/;

				if (badRegex.test(url))
				{
					return false;
				}
				return !url || goodRegex1.test(url) || goodRegex2.test(url);
			},
			{ message: 'Please use a direct link to an image like https://imgur.com/{id} or https://i.imgur.com/{id}.{ext}' },
		),
	tags: z.array(z.string()),
});

type BlueprintFormData = z.infer<typeof blueprintFormSchema>;

interface UiState {
	renderedMarkdown: string;
	uploadProgressBarVisible: boolean;
	uploadProgressPercent: number;
	deletionModalVisible: boolean;
	parsedBlueprint: Blueprint | null;
	v15Decoded: V15DecodedObject | ConvertedBlueprint | null;
	submissionWarnings: string[];
}

interface SelectOption {
	value: string;
	label: string;
}

interface FormFieldError {
	field?: string;
	message?: string;
}

type FormValues = {
	title: string;
	descriptionMarkdown: string;
	blueprintString: string;
	imageUrl: string;
	tags: string[];
};

function EditBlueprintWrapper()
{
	const { blueprintId } = useParams({ from: '/edit/$blueprintId' });
	const navigate = useNavigate();

	const [user] = useAuthState(getAuth(app));

	// First fetch the blueprint summary
	const {
		data: blueprintSummary,
		isLoading: summaryIsLoading,
	} = useEnrichedBlueprintSummary(blueprintId);

	// Fetch raw blueprint data for mutations
	const {
		data: rawBlueprintData,
		isSuccess: rawBlueprintIsSuccess,
		isLoading: rawBlueprintIsLoading,
	} = useRawBlueprint(blueprintId, blueprintSummary);

	// Use enriched blueprint for display
	const {
		data: blueprintData,
		isSuccess: blueprintIsSuccess,
		isLoading: blueprintIsLoading,
		error: blueprintError,
	} = useEnrichedBlueprint(blueprintId, blueprintSummary);

	const { data: allTagsData, isSuccess: allTagsSuccess, isLoading: allTagsLoading } = useTags();
	const tags = React.useMemo(() => allTagsData?.tags || [], [allTagsData]);

	const allDataLoaded = blueprintIsSuccess && rawBlueprintIsSuccess && allTagsSuccess;
	const isLoading = summaryIsLoading || blueprintIsLoading || rawBlueprintIsLoading || allTagsLoading;

	const moderatorQuery = useIsModerator(user?.uid);
	const isModerator = moderatorQuery.data ?? false;

	const updateBlueprintMutation = useUpdateBlueprint();
	const deleteBlueprintMutation = useDeleteBlueprint();

	const [uiState, setUiState] = useState<UiState>({
		renderedMarkdown        : '',
		uploadProgressBarVisible: false,
		uploadProgressPercent   : 0,
		deletionModalVisible    : false,
		parsedBlueprint         : null,
		v15Decoded              : null,
		submissionWarnings      : [],
	});

	// Store current tags separately from form state. This is needed because form state updates don't reliably trigger re-renders for dependent calculations like our tag suggestions filtering.
	const [currentTags, setCurrentTags] = useState<string[]>([]);

	const defaultValues = useMemo((): FormValues =>
	{
		const tags = blueprintData?.tags
			? Object.keys(blueprintData.tags).filter(tag => blueprintData.tags[tag])
			: emptyTags;

		return {
			title              : blueprintData?.title || '',
			descriptionMarkdown: blueprintData?.descriptionMarkdown || '',
			blueprintString    : blueprintData?.blueprintString || '',
			imageUrl           : blueprintData?.image ? `https://imgur.com/${blueprintData.image.id}` : '',
			tags               : tags,
		};
	}, [blueprintData]);

	const form = useForm({
		defaultValues,
		onSubmit: async ({ value }) =>
		{
			// Validate using Zod schema
			try
			{
				blueprintFormSchema.parse(value);
			}
			catch (error)
			{
				if (error instanceof z.ZodError)
				{
					console.error('Validation errors:', error.errors);
					return;
				}
			}

			const submissionWarnings = validateWarnings(value);
			if (submissionWarnings.length > 0)
			{
				setUiState(prev => ({
					...prev,
					submissionWarnings,
				}));
				return;
			}

			if (rawBlueprintData)
			{
				updateBlueprintMutation.mutate({
					id           : blueprintId,
					rawBlueprint : rawBlueprintData,
					formData     : value,
					availableTags: tags,
				});
			}
		},
	});

	const [formInitialized, setFormInitialized] = useState(false);

	useEffect(() =>
	{
		if (allDataLoaded && form && !formInitialized)
		{
			form.reset(defaultValues);
			setCurrentTags(defaultValues.tags);
			setFormInitialized(true);
		}
	}, [allDataLoaded, defaultValues, form, formInitialized]);

	useEffect(() =>
	{
		if (form.state.values.blueprintString)
		{
			try
			{
				const parsedBlueprint = new Blueprint(form.state.values.blueprintString);
				const v15Decoded = parsedBlueprint.getV15Decoded();

				setUiState(prev => ({
					...prev,
					parsedBlueprint,
					v15Decoded,
				}));
			}
			catch (ignored)
			{
				console.log('EditBlueprint.parseBlueprint', {ignored});
				setUiState(prev => ({
					...prev,
					parsedBlueprint: null,
					v15Decoded     : null,
				}));
			}
		}
	}, [form.state.values.blueprintString]);

	useEffect(() =>
	{
		if (form.state.values.descriptionMarkdown)
		{
			const html = md.render(form.state.values.descriptionMarkdown);
			const renderedMarkdown = sanitizeHtml(html);

			setUiState(prev => ({
				...prev,
				renderedMarkdown,
			}));
		}
		else
		{
			setUiState(prev => ({
				...prev,
				renderedMarkdown: '',
			}));
		}
	}, [form.state.values.descriptionMarkdown]);

	const someHaveNoName = useCallback((blueprintBook: BlueprintBook): boolean =>
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

	const validateWarnings = useCallback((formValues: FormValues) =>
	{
		const warnings: string[] = [];

		if (isEmpty(formValues.tags))
		{
			warnings.push('The blueprint has no tags. Consider adding a few tags.');
		}

		try
		{
			const blueprint = new Blueprint(formValues.blueprintString.trim());
			if (isEmpty(blueprint.decodedObject))
			{
				warnings.push('Could not parse blueprint.');
				return warnings;
			}

			if (blueprint.isV14())
			{
				warnings.push('Blueprint is in 0.14 format. Consider upgrading to the latest version.');
			}

			if (blueprint.isBlueprint() && uiState.v15Decoded && 'blueprint' in uiState.v15Decoded && isEmpty(uiState.v15Decoded.blueprint?.label))
			{
				warnings.push('Blueprint has no name. Consider adding a name.');
			}
			if (blueprint.isBlueprint() && uiState.v15Decoded && 'blueprint' in uiState.v15Decoded && isEmpty(uiState.v15Decoded.blueprint?.icons))
			{
				warnings.push('The blueprint has no icons. Consider adding icons.');
			}

			if (blueprint.isBook() && uiState.v15Decoded && 'blueprint_book' in uiState.v15Decoded && uiState.v15Decoded.blueprint_book && someHaveNoName(uiState.v15Decoded.blueprint_book))
			{
				warnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
			}
		}
		catch (e)
		{
			warnings.push('Error validating blueprint: ' + (e instanceof Error ? e.message : 'Unknown error'));
		}

		return warnings;
	}, [uiState.v15Decoded, someHaveNoName]);

	const handleDismissWarnings = useCallback(() =>
	{
		setUiState(prevState => ({
			...prevState,
			submissionWarnings: [],
		}));
	}, []);

	const handleForceSaveBlueprintEdits = useCallback((event: React.MouseEvent<HTMLButtonElement>) =>
	{
		event.preventDefault();

		if (rawBlueprintData)
		{
			updateBlueprintMutation.mutate({
				id           : blueprintId,
				rawBlueprint : rawBlueprintData,
				formData     : form.state.values,
				availableTags: tags,
			});
		}
	}, [updateBlueprintMutation, blueprintId, form.state.values, rawBlueprintData, tags]);

	const handleCancel = useCallback(() =>
	{
		navigate({ to: '/view/$blueprintId', params: { blueprintId }, from: '/edit/$blueprintId' });
	}, [navigate, blueprintId]);

	const handleShowConfirmDelete = useCallback((event: React.MouseEvent<HTMLButtonElement>) =>
	{
		event.preventDefault();
		setUiState(prevState => ({
			...prevState,
			deletionModalVisible: true,
		}));
	}, []);

	const handleHideConfirmDelete = useCallback(() =>
	{
		setUiState(prevState => ({
			...prevState,
			deletionModalVisible: false,
		}));
	}, []);

	const handleDeleteBlueprint = useCallback(() =>
	{
		const authorId = rawBlueprintData?.author?.userId;

		if (!authorId)
		{
			console.error('No author ID found for blueprint');
			return;
		}

		deleteBlueprintMutation.mutate({
			id  : blueprintId,
			authorId,
			tags: currentTags,
		});
	}, [deleteBlueprintMutation, blueprintId, rawBlueprintData, currentTags]);

	const handleTagSelection = useCallback((selectedTags: readonly SelectOption[] | null) =>
	{
		const tagValues = selectedTags ? selectedTags.map(each => each.value) : [];
		(form as any).setFieldValue('tags', tagValues);
		setCurrentTags(tagValues);
	}, [form]);

	const addTag = useCallback((tag: string) =>
	{
		if (!currentTags.includes(tag))
		{
			const updatedTags = [...currentTags, tag];
			(form as any).setFieldValue('tags', updatedTags);
			setCurrentTags(updatedTags);
		}
	}, [form, currentTags]);

	const renderOldThumbnail = useCallback(() =>
	{
		if (!blueprintData?.image)
		{
			return null;
		}

		const {id, type} = blueprintData.image;
		const imageUrl = buildImageUrl(id, type, 'b');

		return (
			<Form.Group as={Row} className='mb-3'>
				<Form.Label column sm='2'>
					{'Old screenshot'}
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img
							variant='top'
							src={imageUrl || noImageAvailable}
							onError={(e) =>
							{
								const target = e.target as HTMLImageElement;
								target.src = noImageAvailable;
							}}
						/>
						<Card.Title className='truncate'>
							{form.state.values.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	}, [blueprintData, form.state.values.title]);

	const renderPreview = useCallback(() =>
	{
		if (!form.state.values.imageUrl)
		{
			return null;
		}

		// Convert imgur URLs to direct image URLs for preview
		let previewUrl = form.state.values.imageUrl;
		const imgurPageRegex = /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/;
		const match = previewUrl.match(imgurPageRegex);
		if (match)
		{
			// Convert https://imgur.com/QbepqZa to https://i.imgur.com/QbepqZa.png
			previewUrl = `https://i.imgur.com/${match[1]}.png`;
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
							src={previewUrl || noImageAvailable}
							key={previewUrl}
							onError={(e) =>
							{
								const target = e.target as HTMLImageElement;
								target.src = noImageAvailable;
							}}
						/>
						<Card.Title className='truncate'>
							{form.state.values.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	}, [form.state.values.imageUrl, form.state.values.title]);

	const getUnusedTagSuggestions = () =>
	{
		if (!user || !blueprintData?.title) return [];

		const tagSuggestions = generateTagSuggestions(
			form.state.values.title || '',
			uiState.parsedBlueprint,
			uiState.v15Decoded,
		);

		return tagSuggestions.filter(tag => !currentTags.includes(tag));
	};

	const unusedTagSuggestions = getUnusedTagSuggestions();

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

	if (isLoading)
	{
		return (
			<h1>
				<FontAwesomeIcon icon={faCog} spin />
				{' Loading data'}
			</h1>
		);
	}

	if (blueprintError || !blueprintData?.title)
	{
		return <NoMatch />;
	}

	const ownedByCurrentUser = user && user.uid === blueprintData?.author?.userId;
	if (!ownedByCurrentUser && !isModerator)
	{
		return (
			<h1>
				You are not the author of this blueprint.
			</h1>
		);
	}

	return (
		<>
			<Modal show={uiState.uploadProgressBarVisible}>
				<Modal.Header>
					<Modal.Title>
						Image Upload Progress
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<ProgressBar
						now={uiState.uploadProgressPercent}
						label={`${uiState.uploadProgressPercent}%`}
						variant='warning'
						className='text-light'
					/>
				</Modal.Body>
			</Modal>
			<Modal show={!isEmpty(uiState.submissionWarnings)}>
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
							uiState.submissionWarnings.map(submissionWarning => (
								<li key={submissionWarning}>
									{submissionWarning}
								</li>
							))
						}
					</ul>
				</Modal.Body>
				<Modal.Footer>
					<ButtonToolbar>
						<Button
							variant='danger'
							type='button'
							onClick={handleForceSaveBlueprintEdits}
							disabled={updateBlueprintMutation.isPending}
						>
							<FontAwesomeIcon icon={faSave} size='lg' />
							{updateBlueprintMutation.isPending ? ' Saving...' : ' Save'}
						</Button>
						<Button
							variant='primary'
							type='button'
							onClick={handleDismissWarnings}
							disabled={updateBlueprintMutation.isPending}
						>
							<FontAwesomeIcon icon={faArrowLeft} size='lg' />
							{' Go back'}
						</Button>
					</ButtonToolbar>
				</Modal.Footer>
			</Modal>
			<Modal show={uiState.deletionModalVisible} onHide={handleHideConfirmDelete}>
				<Modal.Header closeButton>
					<Modal.Title>
						Are you sure you want to delete the blueprint?
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<p>
						{`Deleting: ${form.state.values.title}`}
					</p>
					<p>
						This cannot be undone.
					</p>
				</Modal.Body>
				<Modal.Footer>
					<ButtonToolbar>
						<Button
							variant='danger'
							type='button'
							onClick={handleDeleteBlueprint}
							disabled={deleteBlueprintMutation.isPending}
						>
							{deleteBlueprintMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
						<Button
							onClick={handleHideConfirmDelete}
							disabled={deleteBlueprintMutation.isPending}
						>
							Cancel
						</Button>
					</ButtonToolbar>
				</Modal.Footer>
			</Modal>
			<Container>
				<Row>
					{
						form.state.errors?.length > 0 && <Alert
							variant='danger'
							className='alert-fixed'
							dismissible
						>
							<h4>
								{'Error editing blueprint'}
							</h4>
							<ul>
								{
									form.state.errors.map((error, index) =>
									{
										// Handle both string errors and object errors
										const errorMessage = typeof error === 'string'
											? error
											: error && typeof error === 'object' && 'message' in error
												? ((error as any).message as string) || JSON.stringify(error)
												: JSON.stringify(error);
										const errorKey = typeof error === 'string'
											? error
											: error && typeof error === 'object' && 'field' in error
												? ((error as any).field as string) || `error-${index}`
												: `error-${index}`;

										return (
											<li key={errorKey}>
												{errorMessage}
											</li>
										);
									})
								}
							</ul>
						</Alert>
					}
					{
						updateBlueprintMutation.isError && <Alert
							variant='danger'
							className='alert-fixed'
							dismissible
							onClose={() => updateBlueprintMutation.reset()}
						>
							<h4>
								{'Error updating blueprint'}
							</h4>
							<p>{updateBlueprintMutation.error?.message || 'An unknown error occurred'}</p>
							{updateBlueprintMutation.error && (
								<div className='mt-2'>
									<details>
										<summary>Error Details</summary>
										<pre className='mt-2 p-2 bg-dark text-light rounded'>
											{JSON.stringify(updateBlueprintMutation.error, null, 2)}
										</pre>
									</details>
								</div>
							)}
						</Alert>
					}
					{
						deleteBlueprintMutation.isError && <Alert
							variant='danger'
							className='alert-fixed'
							dismissible
							onClose={() => deleteBlueprintMutation.reset()}
						>
							<h4>
								{'Error deleting blueprint'}
							</h4>
							<p>{deleteBlueprintMutation.error?.message || 'An unknown error occurred'}</p>
							{deleteBlueprintMutation.error && (
								<div className='mt-2'>
									<details>
										<summary>Error Details</summary>
										<pre className='mt-2 p-2 bg-dark text-light rounded'>
											{(() =>
											{
												try
												{
													return JSON.stringify(deleteBlueprintMutation.error, null, 2);
												}
												catch (stringifyError)
												{
													console.error('Error serializing error object:', deleteBlueprintMutation.error);
													console.error('Stringify error:', stringifyError);
													return `Error message: ${deleteBlueprintMutation.error.message}\nStack: ${deleteBlueprintMutation.error.stack || 'No stack trace available'}`;
												}
											})()}
										</pre>
									</details>
								</div>
							)}
						</Alert>
					}
				</Row>
				<PageHeader title={`Editing: ${form.state.values.title}`} />
				<Row>
					<form
						className='w-100'
						onSubmit={(e) =>
						{
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<form.Field
							name='title'
							children={(field) => (
								<Form.Group as={Row} className='mb-3'>
									<Form.Label column sm='2'>
										{'Title'}
									</Form.Label>
									<Col sm={10}>
										<FormControl
											autoFocus
											type='text'
											name={field.name}
											placeholder='Title'
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors?.length > 0 && (
											<div className='text-danger mt-1'>
												{field.state.meta.errors.map(error =>
													typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error),
												).join(', ')}
											</div>
										)}
									</Col>
								</Form.Group>
							)}
						/>

						<form.Field
							name='descriptionMarkdown'
							children={(field) => (
								<>
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
												name={field.name}
												placeholder='Description (plain text or *GitHub Flavored Markdown*)'
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												style={{minHeight: 200}}
											/>
											{field.state.meta.errors?.length > 0 && (
												<div className='text-danger mt-1'>
													{field.state.meta.errors.map(error =>
														typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error),
													).join(', ')}
												</div>
											)}
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
													dangerouslySetInnerHTML={{__html: uiState.renderedMarkdown}}
												/>
											</Card>
										</Col>
									</Form.Group>
								</>
							)}
						/>

						<form.Field
							name='blueprintString'
							children={(field) => (
								<Form.Group as={Row} className='mb-3'>
									<Form.Label column sm='2'>
										{'Blueprint String'}
									</Form.Label>
									<Col sm={10}>
										<FormControl
											className='blueprintString'
											as='textarea'
											name={field.name}
											placeholder='Blueprint String'
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors?.length > 0 && (
											<div className='text-danger mt-1'>
												{field.state.meta.errors.map(error =>
													typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error),
												).join(', ')}
											</div>
										)}
									</Col>
								</Form.Group>
							)}
						/>

						<form.Field
							name='tags'
							children={() => (
								<>
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
												value={currentTags.map(value => ({value, label: value}))}
												options={tags.map(value => ({value, label: value}))}
												onChange={handleTagSelection}
												isMulti
												placeholder='Select at least one tag'
											/>
										</Col>
									</Form.Group>
								</>
							)}
						/>

						{renderOldThumbnail()}

						<form.Field
							name='imageUrl'
							children={(field) => (
								<Form.Group as={Row} className='mb-3'>
									<Form.Label column sm='2'>
										{'Imgur URL'}
									</Form.Label>
									<Col sm={10}>
										<FormControl
											type='text'
											name={field.name}
											placeholder='https://imgur.com/kRua41d'
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors?.length > 0 && (
											<div className='text-danger mt-1'>
												{field.state.meta.errors.map(error =>
													typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error),
												).join(', ')}
											</div>
										)}
									</Col>
								</Form.Group>
							)}
						/>

						{renderPreview()}

						<Form.Group as={Row} className='mb-3'>
							<Col sm={{span: 10, offset: 2}}>
								<ButtonToolbar>
									<Button
										type='submit'
										variant='warning'
										size='lg'
										disabled={updateBlueprintMutation.isPending || deleteBlueprintMutation.isPending}
									>
										<FontAwesomeIcon icon={faSave} size='lg' />
										{updateBlueprintMutation.isPending ? ' Saving...' : ' Save'}
									</Button>
									{
										isModerator && <Button
											variant='danger'
											size='lg'
											onClick={handleShowConfirmDelete}
											disabled={updateBlueprintMutation.isPending || deleteBlueprintMutation.isPending}
										>
											<FontAwesomeIcon icon={faTrash} size='lg' />
											{' Delete'}
										</Button>
									}
									<Button
										type='button'
										size='lg'
										onClick={handleCancel}
										disabled={updateBlueprintMutation.isPending || deleteBlueprintMutation.isPending}
									>
										<FontAwesomeIcon icon={faBan} size='lg' />
										{' Cancel'}
									</Button>
								</ButtonToolbar>
							</Col>
						</Form.Group>
					</form>
				</Row>
			</Container>
		</>
	);
}

export default EditBlueprintWrapper;
