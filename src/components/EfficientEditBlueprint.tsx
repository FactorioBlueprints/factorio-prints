import {faArrowLeft, faBan, faSave, faTrash} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import axios from 'axios';
import classNames from 'classnames';
import difference from 'lodash/difference';
import isEmpty from 'lodash/isEmpty';
import marked from 'marked';
import React, {useContext, useState} from 'react';
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
import Dropzone from 'react-dropzone';

import {useQuery, UseQueryOptions} from 'react-query';
import {useParams} from 'react-router-dom';
import Select from 'react-select';
import UserContext from '../context/userContext';
import generateTagSuggestions from '../helpers/generateTagSuggestions';
import LoadingIcon from './LoadingIcon';

import NoMatch from './NoMatch';
import PageHeader from './PageHeader';
import TagSuggestionButton from './TagSuggestionButton';
import useIsModerator from "../hooks/useIsModerator";
import useTagOptions from "../hooks/useTagOptions";
import scaleImage from "../helpers/ImageScaler";

interface Tag
{
	tag: {
		category: string,
		name: string,
	}
}

interface BlueprintFromServer
{
	key: string,
	systemFrom: string,
	systemTo?: string,
	createdOn: string,
	lastUpdatedById: string,
	title: string,
	descriptionMarkdown: string,
	author: {
		userId: string,
		displayName: string,
	}
	blueprintString: {
		blueprintString: string
	},
	tags               : Tag[],
}

function validateInputs(blueprint: BlueprintFromServer): string[]
{
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

	if (!blueprint.blueprintString)
	{
		submissionErrors.push('Blueprint String may not be empty');
	}
	else if (blueprint.blueprintString.blueprintString.trim().length < 10)
	{
		submissionErrors.push('Blueprint String must be at least 10 characters');
	}

	return submissionErrors;
}

EfficientEditBlueprint.propTypes = {
};

function EfficientEditBlueprint()
{
	const user                       = useContext(UserContext);
	const isModerator                = useIsModerator();
	const {tagValuesSet, tagOptions} = useTagOptions();

	const [blueprint, setBlueprint]                               = useState<BlueprintFromServer>();
	const [uploadProgressBarVisible, setUploadProgressBarVisible] = useState(false);
	const [deletionModalVisible, setDeletionModalVisible]         = useState(false);
	const [uploadProgressPercent, setUploadProgressPercent]       = useState(0);
	const [submissionWarnings, setSubmissionWarnings]             = useState<string[]>([]);
	const [submissionErrors, setSubmissionErrors]                 = useState<string[]>([]);
	const [acceptedFiles, setAcceptedFiles]                       = useState<any>([]);
	const [rejectedFiles, setRejectedFiles]                       = useState<any>([]);
	const [thumbnail, setThumbnail]                               = useState<string>();


	const {blueprintId} = useParams<{ blueprintId: string }>();
	const blueprintKey = blueprintId;

	const queryKey = ['blueprintDetails', blueprintKey];

	const options: UseQueryOptions = {onSuccess: (data: any) => setBlueprint(data.data)};
	const result = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintDetails/${blueprintKey}`),
		options,
	);

	const {isLoading, isError, data} = result;

	console.log('EfficientEditBlueprint', {isLoading, isError, data, blueprint});

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

	// TODO: memoize
	const renderedMarkdown = marked(blueprint.descriptionMarkdown);
	const parsedBlueprint  = parseBlueprint(blueprint.blueprintString.blueprintString);
	const v15Decoded       = parsedBlueprint.getV15Decoded();

	const allTagSuggestions    = generateTagSuggestions(
		blueprint.title,
		parsedBlueprint,
		v15Decoded,
	);
	const unusedTagSuggestions = difference(allTagSuggestions, blueprint.tags);

	const selectValue = blueprint.tags.map(each => each.tag).map(tag => `/${tag.category}/${tag.name}/`);
	console.log({selectValue, tagOptions});


	const actuallySaveBlueprintEdits = async () =>
	{
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
		// this.props.history.push(`/view/${this.props.id}`);
		//
		// // TODO: Delete old images from storage and imgur
	}

	function handleForceSaveBlueprintEdits(event: { preventDefault: () => void })
	{
		event.preventDefault();

		if (!blueprint)
		{
			throw new Error();
		}
		const submissionErrors: string[] = validateInputs(blueprint);
		if (submissionErrors.length > 0)
		{
			setSubmissionErrors(submissionErrors);
			return;
		}

		actuallySaveBlueprintEdits();
	}

	function handleDismissAlert()
	{
		setRejectedFiles([]);
	}

	function handleDismissError()
	{
		setSubmissionErrors([]);
	}

	function handleDismissWarnings()
	{
		setSubmissionWarnings([]);
	}

	function handleShowConfirmDelete(event: React.ChangeEvent<HTMLInputElement>)
	{
		event.preventDefault();
		setDeletionModalVisible(true);
	}

	function handleHideConfirmDelete()
	{
		setDeletionModalVisible(false);
	}

	function handleDeleteBlueprint()
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
					.then(() => this.props.history.push(`/user/${authorId}`));
		*/
	}

	function handleDescriptionChanged(event: React.ChangeEvent<HTMLInputElement>)
	{
		const descriptionMarkdown = event.target.value;
		if (blueprint === undefined) {
			throw new Error();
		}
		const newBlueprint: BlueprintFromServer = {
			...blueprint,
			descriptionMarkdown,
		};
		setBlueprint(newBlueprint);
	}

	function handleDrop(acceptedFiles: any, rejectedFiles: any)
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

		const config = {
			maxWidth : 350,
			maxHeight: 600,
			quality  : 0.70,
		};
		scaleImage(acceptedFiles[0], config, (imageData: string) => setThumbnail(imageData));
	}

	function handleChange(event: React.ChangeEvent<HTMLInputElement>)
	{
		const {name, value} = event.target;

		const newBlueprint: any = {
				...blueprint,
				[name]: value,
		};

		setBlueprint(newBlueprint);
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
							submissionWarnings.map(submissionWarning => (
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
									rejectedFiles.map((rejectedFile: any) => (
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
						>
							<h4>
								Error editing blueprint
							</h4>
							<ul>
								{
									submissionErrors.map(submissionError => (
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
										dangerouslySetInnerHTML={{__html: renderedMarkdown}}
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
									value={blueprint.blueprintString.blueprintString}
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
									value={selectValue}
									options={tagOptions}
									onChange={this.handleTagSelection}
									multi
									placeholder='Select at least one tag'
								/>
							</Col>
						</Form.Group>

						{this.renderOldThumbnail()}

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
									{({getRootProps, getInputProps, isDragActive}) => (
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

						{this.renderPreview()}

						<Form.Group as={Row}>
							<Col sm={{span: 10, offset: 2}}>
								<ButtonToolbar>
									<Button
										type='button'
										variant='warning'
										size='lg'
										onClick={this.handleSaveBlueprintEdits}
									>
										<FontAwesomeIcon icon={faSave} size='lg' />
										{' Save'}
									</Button>
									{
										this.props.isModerator && <Button
											variant='danger'
											size='lg'
											onClick={this.handleShowConfirmDelete}
										>
											<FontAwesomeIcon icon={faTrash} size='lg' />
											{' Delete'}
										</Button>
									}
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

function parseBlueprint(blueprintString)
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
}

export default EfficientEditBlueprint;
