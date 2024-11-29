import {faEdit, faExclamationTriangle} from '@fortawesome/free-solid-svg-icons';
import { DiscussionEmbed } from 'disqus-react';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import React, {useContext} from 'react';
import Button              from 'react-bootstrap/Button';
import Card                from 'react-bootstrap/Card';
import Col                 from 'react-bootstrap/Col';
import Container           from 'react-bootstrap/Container';
import Row                 from 'react-bootstrap/Row';
import {useParams}         from 'react-router-dom';

import UserContext    from '../../context/userContext';
import useBlueprint   from '../../hooks/useBlueprint';
import useIsModerator from '../../hooks/useIsModerator';

import GoogleAd                  from '../GoogleAd';
import BlueprintInfoPanel        from './BlueprintInfoPanel';
import BlueprintMarkdown         from './BlueprintMarkdown';
import BlueprintTitle            from './BlueprintTitle';
import BlueprintTitles           from './BlueprintTitles';
import CopyBlueprintStringButton from './CopyBlueprintButton';
import FavoriteButton            from './FavoriteButton';
import ImgurThumbnail            from './ImgurThumbnail';
import NewRequirementsHistogram  from './NewRequirementsHistogram';
import Spinner                   from './Spinner';
import TagsPanel                 from './TagsPanel';

/*
function renderEditButton(handleTransitionToEdit)
{
	return <Button
		size='lg'
		onClick={handleTransitionToEdit}
	>
		<FontAwesomeIcon icon={faEdit} />
		{' Edit'}
	</Button>;
}
*/

function getFactorioprintsUrl(id) {
	return `https://factorioprints.com/view/${id}`;
}

function EfficientSingleBlueprint()
{
	const {blueprintId} = useParams();
	const blueprintKey  = blueprintId;

	const result = useBlueprint(blueprintKey);

	const {isSuccess, data, isLoading, isError} = result;

	const {user}   = useContext(UserContext);
	const userId = user?.uid;

	const ownedByCurrentUser = isSuccess && userId !== undefined && userId === data.data.author.authorId;
	const blueprintStringSha = isSuccess ? data.data.blueprintString.sha : undefined;

	const isModerator = useIsModerator();

	const adBlocked = !(window.adsbygoogle && window.adsbygoogle.loaded);

	/*
	const navigate = useNavigate();

	function handleTransitionToEdit()
	{
		navigate(`/edit/${blueprintKey}`);
	}
	*/

	function renderEditLink()
	{
		const url = `https://factorioprints.com/edit/${blueprintKey}`;
		return <Button
			size='lg'
			href={url}
		>
			<FontAwesomeIcon icon={faEdit} />
			{' Edit'}
		</Button>;

	}

	if (isLoading)
	{
		return <Spinner />
	}

	if (isError)
	{
		console.log('Error loading blueprint details.', {result});
		return (
			<div className='p-5 rounded-lg jumbotron'>
				<h1>
					<FontAwesomeIcon icon={faExclamationTriangle} size='lg' fixedWidth />
					{'Error loading blueprint details.'}
				</h1>
			</div>
		);
	}

	return (
		<Container>
			{adBlocked && (
				<Row>
					<Col>
						<Card className="mt-4">
							<Card.Body>
								<FontAwesomeIcon icon={faExclamationTriangle} size='lg' fixedWidth />
								{' Ad revenue is used to support hosting the project. Please consider turning off your ad blocker.'}
							</Card.Body>
						</Card>
					</Col>
				</Row>
			)}
			<Row>
				<Col md={9}>
					<div className='d-flex mt-4'>
						<BlueprintTitle blueprintKey={blueprintKey} />
					</div>
				</Col>
				<Col md={3} className='d-flex align-items-center justify-content-end'>
					{/*{(ownedByCurrentUser || isModerator) && renderEditButton(handleTransitionToEdit)}*/}
					{(ownedByCurrentUser || isModerator) && renderEditLink()}
					{!ownedByCurrentUser && <FavoriteButton blueprintKey={blueprintKey} />}
				</Col>
			</Row>
			<Row>
				<Col md={4}>
					<ImgurThumbnail blueprintKey={blueprintKey} />
					<TagsPanel blueprintKey={blueprintKey} />
					<BlueprintInfoPanel
						blueprintKey={blueprintKey}
						blueprintStringSha={blueprintStringSha}
						ownedByCurrentUser={ownedByCurrentUser}
					/>
					<NewRequirementsHistogram blueprintStringSha={blueprintStringSha} />
					<GoogleAd />
				</Col>
				<Col md={8}>
					<Card>
						<Card.Header>
							Details
						</Card.Header>
						<Card.Body>
							<BlueprintMarkdown blueprintKey={blueprintKey} />
							<CopyBlueprintStringButton blueprintStringSha={blueprintStringSha} />
						</Card.Body>
					</Card>
					<Card>
						<Card.Header>
							Blueprint Titles
						</Card.Header>
						<Card.Body>
							<BlueprintTitles blueprintStringSha={blueprintStringSha} blueprintKey={blueprintKey} />
						</Card.Body>
					</Card>
				</Col>
			</Row>
			<Row className='w-100'>
				<DiscussionEmbed
					shortname='factorio-blueprints'
					config={
						{
							url: getFactorioprintsUrl(blueprintKey),
							identifier: blueprintKey,
							title: blueprintKey,
						}
					}
					className='w-100'
				/>
			</Row>
		</Container>
	);
}

export default EfficientSingleBlueprint;
