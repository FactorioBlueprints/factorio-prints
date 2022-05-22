import {faArrowLeft, faBan, faSave, faTrash} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}                     from '@fortawesome/react-fontawesome';
import classNames                            from 'classnames';
import update                                from 'immutability-helper';
import difference                            from 'lodash/difference';
import isEmpty                               from 'lodash/isEmpty';
import some                                  from 'lodash/some';
import {marked}                              from 'marked';

import React, {useContext, useState} from 'react';

import Alert         from 'react-bootstrap/Alert';
import Button        from 'react-bootstrap/Button';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import Card          from 'react-bootstrap/Card';
import Col           from 'react-bootstrap/Col';
import Container     from 'react-bootstrap/Container';
import Form          from 'react-bootstrap/Form';
import FormControl   from 'react-bootstrap/FormControl';
import Modal         from 'react-bootstrap/Modal';
import ProgressBar   from 'react-bootstrap/ProgressBar';
import Row           from 'react-bootstrap/Row';

import Dropzone                 from 'react-dropzone';
import {useNavigate, useParams} from 'react-router-dom';
import Select                   from 'react-select';
import makeAnimated             from 'react-select/animated';

import Blueprint                  from "../Blueprint";
import UserContext                from '../context/userContext';
import noImageAvailable           from "../gif/No_available_image.gif";
import buildImageUrl              from "../helpers/buildImageUrl";
import generateTagSuggestions     from '../helpers/generateTagSuggestions';
import scaleImage                 from "../helpers/ImageScaler";
import useBlueprint               from "../hooks/useBlueprint";
import useBlueprintString         from "../hooks/useBlueprintString";
import useIsModerator             from "../hooks/useIsModerator";
import useTagOptions, {TagOption} from "../hooks/useTagOptions";
import BlueprintStringControl     from "./edit/BlueprintStringControl";
import BlueprintFromServer        from "./edit/types/BlueprintFromServer";
import Tag                        from "./edit/types/Tag";

import LoadingIcon         from './LoadingIcon';
import NoMatch             from './NoMatch';
import PageHeader          from './PageHeader';
import TagSuggestionButton from './TagSuggestionButton';

EfficientEditBlueprint.propTypes = {};

const animatedComponents = makeAnimated();

function convertTagOptionToTag(selectedTag: TagOption): { tag: Tag }
{
	const [category, name] = selectedTag.value.split("/");
	return {tag: {category, name}};
}

function EfficientEditBlueprint()
{
	const user        = useContext(UserContext);
	const isModerator = useIsModerator();

	const {
			  tagValues,
			  tagValuesSet,
			  tagOptions
		  }: { tagValues: string[]; tagValuesSet: Set<string>; tagOptions: TagOption[] } = useTagOptions();

	const navigate = useNavigate();

	const [blueprint, setBlueprint]                               = useState<BlueprintFromServer>();
	const [blueprintString, setBlueprintString]                   = useState<string>();
	const [uploadProgressBarVisible, setUploadProgressBarVisible] = useState(false);
	const [deletionModalVisible, setDeletionModalVisible]         = useState(false);
	const [uploadProgressPercent, setUploadProgressPercent]       = useState(0);
	const [submissionWarnings, setSubmissionWarnings]             = useState<string[]>([]);
	const [submissionErrors, setSubmissionErrors]                 = useState<string[]>([]);
	const [acceptedFiles, setAcceptedFiles]                       = useState<any>([]);
	const [rejectedFiles, setRejectedFiles]                       = useState<any>([]);
	const [thumbnail, setThumbnail]                               = useState<string>();
	const [renderedMarkdown, setRenderedMarkdown]                 = useState<string>();
	const [parsedBlueprint, setParsedBlueprint]                   = useState<Blueprint>();
	const [v15Decoded, setV15Decoded]                             = useState<any>();

	const {blueprintId} = useParams<{ blueprintId: string }>();
	const blueprintKey  = blueprintId;

	const queryKey = ['blueprintDetails', blueprintKey];

	const result                     = useBlueprint(blueprintKey);
	const {isLoading, isError, data} = result;

	React.useEffect(() =>
	{
		const blueprintData: any = data?.data;
		setRenderedMarkdown(blueprintData ? marked(blueprintData.descriptionMarkdown) : '');
		return setBlueprint(blueprintData);
	}, [blueprintKey, data?.data]);

	const {
			  isLoading: blueprintStringIsLoading,
			  isError  : blueprintStringIsError,
			  data     : blueprintStringData
		  } = useBlueprintString(blueprintKey);
	React.useEffect(() =>
	{
		const parsedBlueprint: Blueprint | undefined = parseBlueprint(blueprintString);
		setParsedBlueprint(parsedBlueprint);
		setV15Decoded(parsedBlueprint?.getV15Decoded());
		return setBlueprintString(blueprintStringData?.data);
	}, [blueprintKey, blueprintStringData?.data]);

	if (!user)
	{
		return (
			<>
				<h1>
					{'Edit a Blueprint'}
				</h1>
				<p>
					{'Please log in with Google or GitHub in order to edit a Blueprint.'}
				</p>
			</>
		);
	}

	if (isLoading)
	{
		return (
			<h1>
				<LoadingIcon isLoading={isLoading} />
				{' Loading data'}
			</h1>
		);
	}

	if (isError)
	{
		console.log('EfficientEditBlueprint isError=true', {result});
		return (
			<>
				{'Error loading blueprint.'}
			</>
		);
	}

	if (!blueprint)
	{
		return <NoMatch />;
	}

	const ownedByCurrentUser = user && user.uid === blueprint?.author.userId;
	if (!ownedByCurrentUser && !isModerator)
	{
		return (
			<h1>
				You are not the author of this blueprint.
			</h1>
		);
	}

	const allTagSuggestions: string[] = generateTagSuggestions(
		blueprint.title,
		parsedBlueprint,
		v15Decoded,
	);
	const selectedValues: string[]     = blueprint?.tags
		.map(wrapper => wrapper.tag)
		.filter(tag => tag !== null)
		.map(({category, name}) => `${category}/${name}`) || [];
	const selectedOptions: TagOption[] = selectedValues.map((value => ({label: value, value})));

	const unusedTagSuggestions: string[] = difference(allTagSuggestions, selectedValues);

	const actuallySaveBlueprintEdits: () => Promise<void> = async (): Promise<void> =>
	{
		console.log('EfficientEditBlueprint actuallySaveBlueprintEdits');
		// const [file] = this.state.files;
		// let imagePromise;
		// let uploadTask;
		// if (file)
		// {
		// 	const fileNameRef = app.storage().ref().child(file.name);
		// 	imagePromise      = fileNameRef.getDownloadURL()
		// 		.then(() =>
		// 		{
		// 			this.setState({submissionErrors: [`File with name ${file.name} already exists.`]});
		// 		})
		// 		.catch(() =>
		// 		{
		// 			this.setState({uploadProgressBarVisible: true});
		// 			uploadTask = fileNameRef.put(file);
		// 			uploadTask.on('state_changed', this.handleUploadProgress, this.handleFirebaseStorageError);
		// 			return uploadTask;
		// 		})
		// 		.then(() =>
		// 			fetch('https://api.imgur.com/3/upload.json', {
		// 				method : 'POST',
		// 				headers: EditBlueprint.imgurHeaders,
		// 				body   : file,
		// 			}))
		// 		.catch(this.handleImgurError)
		// 		.then(this.processStatus)
		// 		.then(response => response.json())
		// 		.then(json => json.data)
		// 		.then(data =>
		// 			({
		// 				id        : data.id,
		// 				deletehash: data.deletehash,
		// 				type      : data.type,
		// 				height    : data.height,
		// 				width     : data.width,
		// 			}));
		// }
		// else
		// {
		// 	imagePromise = Promise.resolve(this.state.blueprint.image);
		// }
		//
		// const blueprint = {
		// 	...this.state.blueprint,
		// 	privateData: {
		// 		thumbnailData: this.state.thumbnail,
		// 	},
		// };
		//
		// if (file)
		// {
		// 	blueprint.privateData.fileName = file.name;
		// }
		//
		// if (imagePromise)
		// {
		// 	const image = await imagePromise;
		// 	if (image)
		// 	{
		// 		blueprint.imgurImage = {
		// 			imgurId  : image.id,
		// 			imgurType: image.type,
		// 			height   : image.height,
		// 			width    : image.width,
		// 		};
		// 	}
		// }
		//
		// if (uploadTask)
		// {
		// 	const firebaseImageUrl = await uploadTask.snapshot.ref.getDownloadURL();
		// 	blueprint.privateData.firebaseImageUrl = firebaseImageUrl;
		// }
		//
		// const idToken = await this.context.user.getIdToken();
		// await axios.patch(
		// 	`${process.env.REACT_APP_REST_URL}/api/blueprint/${this.props.id}`,
		// 	blueprint,
		// 	{
		// 		headers: {
		// 			Authorization: `Bearer ${idToken}`,
		// 		},
		// 	});
		//
		// this.props.navigate(`/view/${this.props.id}`);
		//
		// // TODO: Delete old images from storage and imgur
	};

	function handleForceSaveBlueprintEdits(event: React.MouseEvent<HTMLButtonElement>): void
	{
		event.preventDefault();

		if (!blueprint)
		{
			throw new Error();
		}
		const submissionErrors: string[] = validateInputs(blueprint, blueprintString);
		if (submissionErrors.length > 0)
		{
			setSubmissionErrors(submissionErrors);
			return;
		}

		actuallySaveBlueprintEdits();
	}

	function handleDismissAlert(): void
	{
		setRejectedFiles([]);
	}

	function handleDismissError(): void
	{
		setSubmissionErrors([]);
	}

	function handleDismissWarnings(): void
	{
		setSubmissionWarnings([]);
	}

	function handleShowConfirmDelete(event: React.MouseEvent<HTMLButtonElement>): void
	{
		event.preventDefault();
		setDeletionModalVisible(true);
	}

	function handleHideConfirmDelete(): void
	{
		setDeletionModalVisible(false);
	}

	function handleDeleteBlueprint(): void
	{
		/*
				const authorId = this.state.blueprint.author.userId;
				const updates  = {
					[`/blueprints/${this.props.id}`]                  : null,
					[`/users/${authorId}/blueprints/${this.props.id}`]: null,
					[`/thumbnails/${this.props.id}`]                  : null,
					[`/blueprintSummaries/${this.props.id}`]          : null,
				};
				this.props.tags.forEach((tag) =>
				{
					updates[`/byTag/${tag}/${this.props.id}`] = null;
				});
				app.database().ref().update(updates)
					.then(() =>
					{
						if (this.state.blueprint.fileName)
						{
							// TODO also delete imgur image
							const fileNameRef = app.storage().ref().child(this.state.blueprint.fileName);
							return fileNameRef.delete();
						}
						return undefined;
					})
					.then(() => this.props.navigate(`/user/${authorId}`));
		*/
	}

	function handleDescriptionChanged(event: React.ChangeEvent<HTMLInputElement>): void
	{
		const descriptionMarkdown: any = event.target.value;
		if (blueprint === undefined)
		{
			throw new Error();
		}
		const newBlueprint: BlueprintFromServer = {
			...blueprint,
			descriptionMarkdown,
		};
		setBlueprint(newBlueprint);
	}

	function handleDrop(acceptedFiles: any, rejectedFiles: any): void
	{
		setAcceptedFiles(acceptedFiles);
		setRejectedFiles(rejectedFiles);
		const newBlueprint: any = {
			...blueprint,
			imageUrl: acceptedFiles.length > 1 && acceptedFiles[0].preview,
		};
		setBlueprint(newBlueprint);

		if (acceptedFiles.length === 0)
		{
			return;
		}

		const config: { maxHeight: number; maxWidth: number; quality: number } = {
			maxWidth : 350,
			maxHeight: 600,
			quality  : 0.70,
		};
		scaleImage(acceptedFiles[0], config, (imageData: string) => setThumbnail(imageData));
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>): void
	{
		const {name, value}: any = event.target;

		const newBlueprint: any = {
			...blueprint,
			[name]: value,
		};

		setBlueprint(newBlueprint);
	}

	function handleTagSelection(selectedTags: any /*TagOption[]*/): void
	{
		if (blueprint === undefined)
		{
			return;
		}
		if (selectedTags === null)
		{
			return;
		}
		const tags = selectedTags.map(convertTagOptionToTag);

		const newBlueprint: any = {
			...blueprint,
			tags,
		};
		setBlueprint(newBlueprint);
	}

	function addTag(tag: string): void
	{
		const [category, name]: any = tag.split('/');
		const newTag: Tag           = {category, name};
		const newBlueprint: any     = update(blueprint, {tags: {$push: [{tag: newTag}]}});
		setBlueprint(newBlueprint);
	}

	function renderOldThumbnail(): JSX.Element
	{
		if (blueprint === undefined)
		{
			return <></>;
		}

		const imgurImage = blueprint.imgurImage;
		if (imgurImage === undefined)
		{
			return <></>;
		}

		const {imgurId, imgurType} = imgurImage;
		const thumbnail: string    = buildImageUrl(imgurId, imgurType, 'b');

		return (
			<Form.Group as={Row}>
				<Form.Label column sm='2'>
					Old screenshot
				</Form.Label>
				<Col sm={10}>
					<Card className='mb-2 mr-2' style={{width: '14rem', backgroundColor: '#1c1e22'}}>
						<Card.Img variant='top' src={thumbnail} />
						<Card.Title className='truncate'>
							{blueprint.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	}

	function renderPreview(): JSX.Element
	{
		if (!thumbnail || !blueprint)
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
						<Card.Img variant='top' src={thumbnail || noImageAvailable} />
						<Card.Title className='truncate'>
							{blueprint.title}
						</Card.Title>
					</Card>
				</Col>
			</Form.Group>
		);
	}

	function handleSaveBlueprintEdits(event: React.MouseEvent<HTMLButtonElement>)
	{
		event.preventDefault();

		const submissionErrors = validateInputs(blueprint, blueprintString);

		if (submissionErrors.length > 0)
		{
			setSubmissionErrors(submissionErrors);
			return;
		}

		const submissionWarnings = validateWarnings(blueprint, blueprintString || '', v15Decoded);
		if (submissionWarnings.length > 0)
		{
			setSubmissionWarnings(submissionWarnings);
			return;
		}

		actuallySaveBlueprintEdits();
	}

	function handleCancel()
	{
		navigate(`/view/${blueprintId}`);
	}

	return (
		<>
			<Modal show={uploadProgressBarVisible}>
				<Modal.Header>
					<Modal.Title>
						Image Upload Progress
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<ProgressBar
						now={uploadProgressPercent}
						label={`${uploadProgressPercent}%`}
						variant='warning'
						className='text-light'
					/>
				</Modal.Body>
			</Modal>
			<Modal show={!isEmpty(submissionWarnings)}>
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
							submissionWarnings.map((submissionWarning): JSX.Element => (
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
			<Modal show={deletionModalVisible} onHide={handleHideConfirmDelete}>
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
						rejectedFiles.length > 0 && <Alert
							variant='warning'
							className='alert-fixed'
							onClose={handleDismissAlert}
						>
							<h4>
								{'Error uploading files'}
							</h4>
							<ul>
								{
									rejectedFiles.map((rejectedFile: any): JSX.Element => (
										<li key={rejectedFile.name}>
											{rejectedFile.name}
										</li>
									))
								}
							</ul>
						</Alert>
					}
					{
						submissionErrors.length > 0 && <Alert
							variant='danger'
							className='alert-fixed'
							onClose={handleDismissError}
							dismissible
						>
							<h4>
								Error editing blueprint
							</h4>
							<ul>
								{
									submissionErrors.map((submissionError): JSX.Element => (
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
									onChange={handleChange}
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
									onChange={handleDescriptionChanged}
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
										dangerouslySetInnerHTML={{__html: renderedMarkdown || ''}}
									/>
								</Card>
							</Col>
						</Form.Group>

						<BlueprintStringControl
							blueprintString={blueprintString}
							setBlueprintString={setBlueprintString}
							isLoading={blueprintStringIsLoading}
							isError={blueprintStringIsError}
						/>

						{
							unusedTagSuggestions.length > 0
							&& <Form.Group as={Row}>
								<Form.Label column sm='2'>
									{'Tag Suggestions'}
								</Form.Label>
								<Col sm={10}>
									<ButtonToolbar>
										{
											unusedTagSuggestions.map((tagSuggestion): JSX.Element => (
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

						<Form.Group as={Row}>
							<Form.Label column sm='2'>
								{'Tags'}
							</Form.Label>
							<Col sm={10}>
								<Select
									value={selectedOptions}
									options={tagOptions}
									onChange={handleTagSelection}
									isMulti
									closeMenuOnSelect
									components={animatedComponents}
									placeholder='Select at least one tag'
									className='tag-form'
								/>
							</Col>
						</Form.Group>

						{renderOldThumbnail()}

						<Form.Group as={Row}>
							<Form.Label column sm='2'>
								Replacement screenshot
							</Form.Label>
							<Col sm={10}>
								<Dropzone
									accept=' image/*'
									maxSize={10000000}
									onDrop={handleDrop}
								>
									{({getRootProps, getInputProps, isDragActive}): JSX.Element => (
										<div
											{...getRootProps()}
											className={classNames('dropzone', {'dropzone--isActive': isDragActive})}
										>
											<input {...getInputProps()} />
											{
												isDragActive
													? <p>
														Drop files here...
													</p>
													: <p>
														{'Drop an image file here, or click to open the file chooser.'}
													</p>
											}
										</div>
									)}
								</Dropzone>
							</Col>
						</Form.Group>

						{renderPreview()}

						<Form.Group as={Row}>
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
}

function parseBlueprint(blueprintString: string | undefined): Blueprint | undefined
{
	if (blueprintString === undefined)
	{
		return undefined;
	}
	try
	{
		return new Blueprint(blueprintString);
	}
	catch (ignored)
	{
		console.log('EfficientEditBlueprint.parseBlueprint', {ignored});
		return undefined;
	}
}

function validateInputs(blueprint: BlueprintFromServer | undefined, blueprintString: string | undefined): string[]
{
	if (blueprint === undefined)
	{
		return [];
	}

	const submissionErrors: string[] = [];
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

	if (!blueprintString)
	{
		submissionErrors.push('Blueprint String may not be empty');
	}
	else if (blueprintString.trim().length < 10)
	{
		submissionErrors.push('Blueprint String must be at least 10 characters');
	}

	return submissionErrors;
}

function validateWarnings(
	blueprintState: BlueprintFromServer | undefined,
	blueprintString: string,
	v15Decoded: any
): string[]
{
	if (blueprintState === undefined)
	{
		return [];
	}

	const submissionWarnings = [];

	if (isEmpty(blueprintState.tags))
	{
		submissionWarnings.push('The blueprint has no tags. Consider adding a few tags.');
	}

	const blueprint = new Blueprint(blueprintString.trim());
	if (isEmpty(blueprint.decodedObject))
	{
		submissionWarnings.push('Could not parse blueprint.');
		return submissionWarnings;
	}

	if (blueprint.isBlueprint() && isEmpty(v15Decoded.blueprint.label))
	{
		submissionWarnings.push('Blueprint has no name. Consider adding a name.');
	}
	if (blueprint.isBlueprint() && isEmpty(v15Decoded.blueprint.icons))
	{
		submissionWarnings.push('The blueprint has no icons. Consider adding icons.');
	}

	if (blueprint.isBook() && some(v15Decoded.blueprint_book.blueprints, eachBlueprint => isEmpty(eachBlueprint.blueprint.label)))
	{
		submissionWarnings.push('Some blueprints in the book have no name. Consider naming all blueprints.');
	}

	return submissionWarnings;
}

export default EfficientEditBlueprint;
