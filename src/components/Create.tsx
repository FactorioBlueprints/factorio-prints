import {faGithub, faGoogle} from '@fortawesome/free-brands-svg-icons';
import {faArrowLeft, faBan, faSave} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useNavigate} from '@tanstack/react-router';
import DOMPurify from 'dompurify';
import {
	type AuthProvider,
	GithubAuthProvider,
	GoogleAuthProvider,
	getAuth,
	signInWithPopup,
	type User,
} from 'firebase/auth';
import update from 'immutability-helper';
import difference from 'lodash/difference';
import isEmpty from 'lodash/isEmpty';
import some from 'lodash/some';
import MarkdownIt from 'markdown-it';
import type React from 'react';
import {useCallback, useEffect, useState} from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Modal from 'react-bootstrap/Modal';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Row from 'react-bootstrap/Row';
import {useAuthState} from 'react-firebase-hooks/auth';
import Select from 'react-select';
import Blueprint from '../Blueprint';

import {app} from '../base';
import noImageAvailable from '../gif/No_available_image.gif';
import generateTagSuggestions from '../helpers/generateTagSuggestions';
import {useCreateBlueprint} from '../hooks/useCreateBlueprint';
import {useTags} from '../hooks/useTags';
import {loadFromStorage, removeFromStorage, STORAGE_KEYS, saveToStorage} from '../localStorage';
import {parseVersion3} from '../parsing/blueprintParser';
import {MarkdownWithRichText} from './core/text/MarkdownWithRichText';
import {RichText} from './core/text/RichText';
import PageHeader from './PageHeader';
import TagSuggestionButton from './TagSuggestionButton';

interface BlueprintFormData {
	title: string;
	descriptionMarkdown: string;
	blueprintString: string;
	imageUrl: string;
	tags?: string[];
}

interface CreateState {
	renderedMarkdown: string;
	submissionErrors: string[];
	submissionWarnings: string[];
	uploadProgressBarVisible: boolean;
	uploadProgressPercent: number;
	blueprint: BlueprintFormData;
	blueprintPasted: boolean;
	blueprintValidationError: string | null;
}

interface SelectOption {
	value: string;
	label: string;
}

type BlueprintBookEntry = {
	blueprint?: {
		label?: string;
	};
	blueprint_book?: BlueprintBook;
};

type BlueprintBook = {
	blueprints: BlueprintBookEntry[];
};

const md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true,
	breaks: false,
});

const defaultTableRenderer =
	md.renderer.rules.table_open ||
	((tokens: any, idx: number, options: any, env: any, self: any) => self.renderToken(tokens, idx, options));

md.renderer.rules.table_open = (tokens: any, idx: number, options: any, env: any, self: any) => {
	tokens[idx].attrSet('class', 'table table-striped table-bordered');
	return defaultTableRenderer(tokens, idx, options, env, self);
};

const emptyTags: string[] = [];

const initialState: CreateState = {
	renderedMarkdown: '',
	submissionErrors: [],
	submissionWarnings: [],
	uploadProgressBarVisible: false,
	uploadProgressPercent: 0,
	blueprint: {
		title: '',
		descriptionMarkdown: '',
		blueprintString: '',
		imageUrl: '',
	},
	blueprintPasted: false,
	blueprintValidationError: null,
};

const Create: React.FC = () => {
	const [user] = useAuthState(getAuth(app)) as [User | null | undefined, boolean, Error | undefined];
	const navigate = useNavigate();
	const [state, setState] = useState<CreateState>(initialState);
	const [parsedBlueprint, setParsedBlueprint] = useState<Blueprint | null>(null);
	const [v15Decoded, setV15Decoded] = useState<any>(null);

	const [showAuthPrompt, setShowAuthPrompt] = useState(false);
	const [pendingSubmission, setPendingSubmission] = useState(false);

	const {data: tagsData, isLoading: tagsLoading} = useTags();
	const tags = tagsData?.tags || [];

	const createBlueprintMutation = useCreateBlueprint();
	const googleProvider = useState(() => {
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({prompt: 'consent select_account'});
		return provider;
	})[0];

	const githubProvider = useState(() => {
		const provider = new GithubAuthProvider();
		provider.setCustomParameters({allow_signup: 'true'});
		return provider;
	})[0];

	const authenticate = useCallback((provider: AuthProvider) => {
		signInWithPopup(getAuth(app), provider)
			.then(() => {
				setShowAuthPrompt(false);
			})
			.catch((error) => {
				if (error.code !== 'auth/popup-closed-by-user') {
					console.error({error});
				}
			});
	}, []);

	const parseBlueprint = useCallback((blueprintString: string): Blueprint | null => {
		try {
			return new Blueprint(blueprintString);
		} catch (ignored) {
			console.log('Create.parseBlueprint', {ignored});
			return null;
		}
	}, []);

	const cacheBlueprintState = useCallback(
		(blueprint: BlueprintFormData | null) => {
			if (blueprint) {
				const newBlueprint = {
					...blueprint,
					tags: blueprint.tags || emptyTags,
				};

				const renderedMarkdown = DOMPurify.sanitize(md.render(blueprint.descriptionMarkdown || ''));
				const parsedBp = parseBlueprint(blueprint.blueprintString);
				const decoded = parsedBp ? parsedBp.getV15Decoded() : null;

				setState((prevState) => ({
					...prevState,
					blueprint: newBlueprint,
					renderedMarkdown,
					blueprintPasted: !!parsedBp && !!decoded,
				}));

				setParsedBlueprint(parsedBp);
				setV15Decoded(decoded);
			}
		},
		[parseBlueprint],
	);

	useEffect(() => {
		const blueprint = loadFromStorage(STORAGE_KEYS.CREATE_FORM);
		if (blueprint) {
			cacheBlueprintState(blueprint);
		}
	}, [cacheBlueprintState]);

	useEffect(() => {
		saveToStorage(STORAGE_KEYS.CREATE_FORM, state.blueprint);
	}, [state.blueprint]);

	const handleDismissError = useCallback(() => {
		setState((prevState) => ({
			...prevState,
			submissionErrors: [],
		}));
	}, []);

	const handleDismissWarnings = useCallback(() => {
		setState((prevState) => ({
			...prevState,
			submissionWarnings: [],
		}));
	}, []);

	const handleDescriptionChanged = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const descriptionMarkdown = event.target.value;
		const renderedMarkdown = DOMPurify.sanitize(md.render(descriptionMarkdown || ''));
		setState((prevState) => ({
			...prevState,
			renderedMarkdown,
			blueprint: {
				...prevState.blueprint,
				descriptionMarkdown,
			},
		}));
	}, []);

	const handleChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			const {name, value} = event.target;

			if (name === 'blueprintString') {
				const newParsedBlueprint = parseBlueprint(value);
				const newV15Decoded = newParsedBlueprint ? newParsedBlueprint.getV15Decoded() : null;

				setParsedBlueprint(newParsedBlueprint);
				setV15Decoded(newV15Decoded);
			}

			setState((prevState) => ({
				...prevState,
				blueprint: {
					...prevState.blueprint,
					[name]: value,
				},
			}));
		},
		[parseBlueprint],
	);

	const handleBlueprintPaste = useCallback(
		(event: React.ChangeEvent<HTMLTextAreaElement>) => {
			const value = event.target.value.trim();

			if (!value) {
				setState((prevState) => ({
					...prevState,
					blueprint: {
						...prevState.blueprint,
						blueprintString: '',
					},
					blueprintPasted: false,
					blueprintValidationError: null,
				}));
				return;
			}

			const newParsedBlueprint = parseBlueprint(value);
			const newV15Decoded = newParsedBlueprint ? newParsedBlueprint.getV15Decoded() : null;

			setParsedBlueprint(newParsedBlueprint);
			setV15Decoded(newV15Decoded);

			// Check if the blueprint is valid
			if (!newParsedBlueprint || !newV15Decoded) {
				setState((prevState) => ({
					...prevState,
					blueprint: {
						...prevState.blueprint,
						blueprintString: value,
					},
					blueprintPasted: true,
					blueprintValidationError: 'Invalid blueprint string. Please paste a valid Factorio blueprint.',
				}));
				return;
			}

			// Extract title and description from blueprint if available
			let extractedTitle = '';
			let extractedDescription = '';

			if (newParsedBlueprint.isBlueprint() && newV15Decoded.blueprint) {
				extractedTitle = newV15Decoded.blueprint.label || '';
				extractedDescription = newV15Decoded.blueprint.description || '';
			} else if (newParsedBlueprint.isBook() && newV15Decoded.blueprint_book) {
				extractedTitle = newV15Decoded.blueprint_book.label || '';
				extractedDescription = newV15Decoded.blueprint_book.description || '';
			}

			// Extract version tag
			const version = newV15Decoded.blueprint?.version || newV15Decoded.blueprint_book?.version;
			let versionTag: string | undefined;
			if (version) {
				// Use parseVersion3 to get major.minor.patch format, then extract major.minor
				const fullVersion = parseVersion3(version);
				if (fullVersion && !fullVersion.startsWith('Invalid')) {
					const versionParts = fullVersion.split('.');
					versionTag = `/version/${versionParts[0]},${versionParts[1]}/`;
				}
			}

			setState((prevState) => ({
				...prevState,
				blueprint: {
					...prevState.blueprint,
					blueprintString: value,
					title: prevState.blueprint.title || extractedTitle,
					descriptionMarkdown: prevState.blueprint.descriptionMarkdown || extractedDescription,
					tags:
						versionTag && !prevState.blueprint.tags?.includes(versionTag)
							? [...(prevState.blueprint.tags || []), versionTag]
							: prevState.blueprint.tags,
				},
				blueprintPasted: true,
				blueprintValidationError: null,
				renderedMarkdown:
					prevState.blueprint.descriptionMarkdown || extractedDescription
						? DOMPurify.sanitize(md.render(prevState.blueprint.descriptionMarkdown || extractedDescription))
						: '',
			}));
		},
		[parseBlueprint],
	);

	const someHaveNoName = useCallback((blueprintBook: BlueprintBook): boolean => {
		return some(blueprintBook.blueprints, (eachEntry: BlueprintBookEntry) => {
			if (eachEntry.blueprint_book) return someHaveNoName(eachEntry.blueprint_book);
			if (eachEntry.blueprint) return isEmpty(eachEntry.blueprint.label);
			return false;
		});
	}, []);

	const validateInputs = useCallback((): string[] => {
		const submissionErrors: string[] = [];
		const {blueprint} = state;
		if (!blueprint.title) {
			submissionErrors.push('Title may not be empty');
		} else if (blueprint.title.trim().length < 10) {
			submissionErrors.push('Title must be at least 10 characters');
		}

		if (!blueprint.descriptionMarkdown) {
			submissionErrors.push('Description Markdown may not be empty');
		} else if (blueprint.descriptionMarkdown.trim().length < 10) {
			submissionErrors.push('Description Markdown must be at least 10 characters');
		}

		if (!blueprint.blueprintString) {
			submissionErrors.push('Blueprint String may not be empty');
		} else if (blueprint.blueprintString.trim().length < 10) {
			submissionErrors.push('Blueprint String must be at least 10 characters');
		}

		const badRegex = /^https:\/\/imgur\.com\/(a|gallery)\/[a-zA-Z0-9]+$/;
		if (badRegex.test(blueprint.imageUrl)) {
			submissionErrors.push(
				'Please use a direct link to an image like https://imgur.com/{id}. On Imgur, either: Click the share icon, then the link icon; OR hover over the image, click the inner of the two ... buttons, then click Copy Link.',
			);
		} else {
			const goodRegex1 = /^https:\/\/i\.imgur\.com\/[a-zA-Z0-9]+\.[a-zA-Z0-9]{3,4}$/;
			const goodRegex2 = /^https:\/\/imgur\.com\/[a-zA-Z0-9]+$/;
			if (!goodRegex1.test(blueprint.imageUrl) && !goodRegex2.test(blueprint.imageUrl)) {
				submissionErrors.push(
					'Please use a direct link to an image like https://imgur.com/{id} or https://i.imgur.com/{id}.{ext}. On Imgur, either: Click the share icon, then the link icon; OR hover over the image, click the inner of the two ... buttons, then click Copy Link.',
				);
			}
		}

		return submissionErrors;
	}, [state]);

	const validateWarnings = useCallback((): string[] => {
		const submissionWarnings: string[] = [];

		if (isEmpty(state.blueprint.tags)) {
			submissionWarnings.push('The blueprint has no tags. Consider adding a few tags.');
		}

		if (state.blueprintValidationError) {
			submissionWarnings.push('Could not parse blueprint.');
			return submissionWarnings;
		}

		const blueprint = new Blueprint(state.blueprint.blueprintString.trim());
		if (isEmpty(blueprint.decodedObject)) {
			submissionWarnings.push('Could not parse blueprint.');
			return submissionWarnings;
		}

		if (blueprint.isBlueprint() && v15Decoded && isEmpty(v15Decoded.blueprint.label)) {
			submissionWarnings.push('Blueprint has no name. Consider adding a name.');
		}
		if (blueprint.isBlueprint() && v15Decoded && isEmpty(v15Decoded.blueprint.icons)) {
			submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
		}

		if (blueprint.isBook() && v15Decoded && someHaveNoName(v15Decoded.blueprint_book)) {
			submissionWarnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
		}

		return submissionWarnings;
	}, [state.blueprint, v15Decoded, someHaveNoName, state.blueprintValidationError]);

	useEffect(() => {
		if (user && pendingSubmission) {
			setPendingSubmission(false);

			const submissionErrors = validateInputs();
			if (submissionErrors.length > 0) {
				setState((prevState) => ({
					...prevState,
					submissionErrors,
				}));
				return;
			}

			const submissionWarnings = validateWarnings();
			if (submissionWarnings.length > 0) {
				setState((prevState) => ({
					...prevState,
					submissionWarnings,
				}));
				return;
			}

			createBlueprintMutation.mutate(
				{
					formData: state.blueprint,
					user: user,
				},
				{
					onSuccess: () => {
						setState(initialState);
						removeFromStorage(STORAGE_KEYS.CREATE_FORM);
					},
				},
			);
		}
	}, [user, pendingSubmission, createBlueprintMutation, state.blueprint, validateInputs, validateWarnings]);

	const handleCreateBlueprint = useCallback(
		(event: React.FormEvent) => {
			event.preventDefault();

			if (!user) {
				setPendingSubmission(true);
				setShowAuthPrompt(true);
				return;
			}

			const submissionErrors = validateInputs();

			if (submissionErrors.length > 0) {
				setState((prevState) => ({
					...prevState,
					submissionErrors,
				}));
				return;
			}

			const submissionWarnings = validateWarnings();
			if (submissionWarnings.length > 0) {
				setState((prevState) => ({
					...prevState,
					submissionWarnings,
				}));
				return;
			}

			createBlueprintMutation.mutate(
				{
					formData: state.blueprint,
					user: user!,
				},
				{
					onSuccess: () => {
						setState(initialState);
						removeFromStorage(STORAGE_KEYS.CREATE_FORM);
					},
				},
			);
		},
		[createBlueprintMutation, state.blueprint, user, validateInputs, validateWarnings],
	);

	const handleForceCreateBlueprint = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault();

			if (!user) {
				setPendingSubmission(true);
				setShowAuthPrompt(true);
				return;
			}

			const submissionErrors = validateInputs();
			if (submissionErrors.length > 0) {
				setState((prevState) => ({
					...prevState,
					submissionErrors,
				}));
				return;
			}

			createBlueprintMutation.mutate(
				{
					formData: state.blueprint,
					user: user!,
				},
				{
					onSuccess: () => {
						setState(initialState);
						removeFromStorage(STORAGE_KEYS.CREATE_FORM);
					},
				},
			);
		},
		[createBlueprintMutation, state.blueprint, user, validateInputs],
	);

	const handleCancel = useCallback(() => {
		removeFromStorage(STORAGE_KEYS.CREATE_FORM);
		navigate({to: '/blueprints', from: '/create'});
	}, [navigate]);

	const handleTagSelection = useCallback((selectedTags: SelectOption[]) => {
		const tags = selectedTags.map((each) => each.value);
		setState((prevState) => ({
			...prevState,
			blueprint: {
				...prevState.blueprint,
				tags,
			},
		}));
	}, []);

	const addTag = useCallback((tag: string) => {
		setState((prevState) =>
			update(prevState, {
				blueprint: {tags: {$push: [tag]}},
			}),
		);
	}, []);

	const renderPreview = useCallback(() => {
		if (!state.blueprint.imageUrl) {
			return <div />;
		}

		// Convert imgur URLs to direct image URLs for preview
		let previewUrl = state.blueprint.imageUrl;
		const imgurPageRegex = /^https:\/\/imgur\.com\/([a-zA-Z0-9]{7})$/;
		const match = previewUrl.match(imgurPageRegex);
		if (match) {
			// Convert https://imgur.com/QbepqZa to https://i.imgur.com/QbepqZa.png
			previewUrl = `https://i.imgur.com/${match[1]}.png`;
		}

		return (
			<Form.Group
				as={Row}
				className="mb-3"
			>
				<Form.Label
					column
					sm="2"
				>
					{'Attached screenshot'}
				</Form.Label>
				<Col sm={10}>
					<Card
						className="mb-2 mr-2"
						style={{width: '14rem', backgroundColor: '#1c1e22'}}
					>
						<Card.Img
							variant="top"
							src={previewUrl || noImageAvailable}
							key={previewUrl}
							onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
								e.currentTarget.src = noImageAvailable;
							}}
						/>
						<Card.Title className="truncate">
							<RichText text={state.blueprint.title} />
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	}, [state.blueprint]);

	const {blueprint} = state;
	const allTagSuggestions = generateTagSuggestions(state.blueprint.title, parsedBlueprint, v15Decoded);
	const unusedTagSuggestions = difference(allTagSuggestions, state.blueprint.tags || []);

	return (
		<>
			<Modal
				show={showAuthPrompt}
				onHide={() => {
					setShowAuthPrompt(false);
					setPendingSubmission(false);
				}}
			>
				<Modal.Header closeButton>
					<Modal.Title>Sign in to Save Blueprint</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<p className="mb-4">
						Please sign in with Google or GitHub to save your blueprint. Your blueprint data will be
						preserved.
					</p>
					<div className="d-flex flex-column">
						<Button
							type="button"
							className="google w-100 mb-2"
							style={{marginLeft: 0, marginRight: 0}}
							onClick={() => authenticate(googleProvider)}
						>
							<FontAwesomeIcon
								icon={faGoogle}
								size="lg"
								fixedWidth
							/>
							{' Log in with Google'}
						</Button>
						<Button
							type="button"
							className="github w-100"
							style={{marginLeft: 0, marginRight: 0}}
							onClick={() => authenticate(githubProvider)}
						>
							<FontAwesomeIcon
								icon={faGithub}
								size="lg"
								fixedWidth
							/>
							{' Log in with GitHub'}
						</Button>
					</div>
				</Modal.Body>
			</Modal>
			<Modal show={state.uploadProgressBarVisible}>
				<Modal.Header>
					<Modal.Title>Image Upload Progress</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<ProgressBar
						now={state.uploadProgressPercent}
						label={`${state.uploadProgressPercent}%`}
						variant="warning"
						className="text-light"
					/>
				</Modal.Body>
			</Modal>
			<Modal show={!isEmpty(state.submissionWarnings)}>
				<Modal.Header>
					<Modal.Title>{'Submission warnings'}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<p>
						{
							'The following warnings occurred while submitting your blueprint. Do you want to save it anyway or go back and make further edits?'
						}
					</p>
					<ul>
						{state.submissionWarnings.map((submissionWarning) => (
							<li key={submissionWarning}>{submissionWarning}</li>
						))}
					</ul>
				</Modal.Body>
				<Modal.Footer>
					<ButtonToolbar>
						<Button
							variant="danger"
							type="button"
							onClick={handleForceCreateBlueprint}
							disabled={createBlueprintMutation.isPending}
						>
							<FontAwesomeIcon
								icon={faSave}
								size="lg"
							/>
							{createBlueprintMutation.isPending ? ' Saving...' : ' Save'}
						</Button>
						<Button
							variant="primary"
							type="button"
							onClick={handleDismissWarnings}
							disabled={createBlueprintMutation.isPending}
						>
							<FontAwesomeIcon
								icon={faArrowLeft}
								size="lg"
							/>
							{' Go back'}
						</Button>
					</ButtonToolbar>
				</Modal.Footer>
			</Modal>

			<Container>
				<Row>
					{state.submissionErrors.length > 0 && (
						<Alert
							variant="danger"
							className="alert-fixed"
							dismissible
							onClose={handleDismissError}
						>
							<h4>{'Error submitting blueprint'}</h4>
							<ul>
								{state.submissionErrors.map((submissionError) => (
									<li key={submissionError}>{submissionError}</li>
								))}
							</ul>
						</Alert>
					)}
					{createBlueprintMutation.isError && (
						<Alert
							variant="danger"
							className="alert-fixed"
							dismissible
							onClose={() => createBlueprintMutation.reset()}
						>
							<h4>{'Error creating blueprint'}</h4>
							<p>{createBlueprintMutation.error?.message || 'An unknown error occurred'}</p>
							{createBlueprintMutation.error && (
								<div className="mt-2">
									<details>
										<summary>Error Details</summary>
										<pre className="mt-2 p-2 bg-dark text-light rounded">
											{JSON.stringify(createBlueprintMutation.error, null, 2)}
										</pre>
									</details>
								</div>
							)}
						</Alert>
					)}
				</Row>
				<PageHeader title="Create a new Blueprint" />
				<Row>
					<Form className="w-100">
						<Form.Group
							as={Row}
							className="mb-3"
						>
							<Form.Label
								column
								sm="2"
							>
								{'Blueprint String'}
							</Form.Label>
							<Col sm={10}>
								<FormControl
									autoFocus
									className="blueprintString"
									as="textarea"
									name="blueprintString"
									placeholder="Paste your Factorio blueprint string here"
									value={blueprint.blueprintString}
									onChange={handleBlueprintPaste}
									style={{minHeight: 150}}
								/>
								{state.blueprintValidationError && (
									<Alert
										variant="warning"
										className="mt-2"
									>
										{state.blueprintValidationError}
									</Alert>
								)}
							</Col>
						</Form.Group>

						{state.blueprintPasted && (
							<>
								<Form.Group
									as={Row}
									className="mb-3"
								>
									<Form.Label
										column
										sm="2"
									>
										{'Title'}
									</Form.Label>
									<Col sm={10}>
										<FormControl
											type="text"
											name="title"
											placeholder="Title"
											value={blueprint.title}
											onChange={handleChange}
										/>
										{blueprint.title && (
											<div className="mt-2 p-2 border rounded">
												<small className="text-muted">Preview:</small>
												<div className="mt-1">
													<RichText text={blueprint.title} />
												</div>
											</div>
										)}
									</Col>
								</Form.Group>

								<Form.Group
									as={Row}
									className="mb-3"
								>
									<Form.Label
										column
										sm="2"
									>
										{'Description '}
										<a href="https://guides.github.com/features/mastering-markdown/">
											{'[Tutorial]'}
										</a>
									</Form.Label>
									<Col sm={10}>
										<FormControl
											as="textarea"
											placeholder="Description (plain text or *GitHub Flavored Markdown*)"
											value={blueprint.descriptionMarkdown}
											onChange={handleDescriptionChanged}
											style={{minHeight: 200}}
										/>
									</Col>
								</Form.Group>

								<Form.Group
									as={Row}
									className="mb-3"
								>
									<Form.Label
										column
										sm="2"
									>
										{'Description (Preview)'}
									</Form.Label>
									<Col sm={10}>
										<Card>
											<div style={{minHeight: 200, padding: '1rem'}}>
												<MarkdownWithRichText markdown={blueprint.descriptionMarkdown || ''} />
											</div>
										</Card>
									</Col>
								</Form.Group>

								{unusedTagSuggestions.length > 0 && (
									<Form.Group
										as={Row}
										className="mb-3"
									>
										<Form.Label
											column
											sm="2"
										>
											{'Tag Suggestions'}
										</Form.Label>
										<Col sm={10}>
											<ButtonToolbar>
												{unusedTagSuggestions.map((tagSuggestion) => (
													<TagSuggestionButton
														key={tagSuggestion}
														tagSuggestion={tagSuggestion}
														addTag={addTag}
													/>
												))}
											</ButtonToolbar>
										</Col>
									</Form.Group>
								)}

								<Form.Group
									as={Row}
									className="mb-3"
								>
									<Form.Label
										column
										sm="2"
									>
										{'Tags'}
									</Form.Label>
									<Col sm={10}>
										<Select
											value={(state.blueprint.tags || []).map((value) => ({value, label: value}))}
											options={tags.map((value) => ({value, label: value}))}
											onChange={handleTagSelection}
											isMulti
											placeholder="Select at least one tag"
											isLoading={tagsLoading}
										/>
									</Col>
								</Form.Group>

								<Form.Group
									as={Row}
									className="mb-3"
								>
									<Form.Label
										column
										sm="2"
									>
										{'Imgur URL'}
									</Form.Label>
									<Col sm={10}>
										<FormControl
											type="text"
											name="imageUrl"
											placeholder="https://imgur.com/kRua41d"
											value={blueprint.imageUrl}
											onChange={handleChange}
										/>
									</Col>
								</Form.Group>

								{renderPreview()}
							</>
						)}

						{state.blueprintPasted && (
							<Form.Group
								as={Row}
								className="mb-3"
							>
								<Col sm={{span: 10, offset: 2}}>
									<ButtonToolbar>
										<Button
											type="button"
											variant="warning"
											size="lg"
											onClick={handleCreateBlueprint}
											disabled={createBlueprintMutation.isPending}
										>
											<FontAwesomeIcon
												icon={faSave}
												size="lg"
											/>
											{createBlueprintMutation.isPending ? ' Saving...' : ' Save'}
										</Button>
										<Button
											type="button"
											size="lg"
											onClick={handleCancel}
											disabled={createBlueprintMutation.isPending}
										>
											<FontAwesomeIcon
												icon={faBan}
												size="lg"
											/>
											{' Cancel'}
										</Button>
									</ButtonToolbar>
								</Col>
							</Form.Group>
						)}
					</Form>
				</Row>
			</Container>
		</>
	);
};

export default Create;
