import {faToggleOff, faToggleOn} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}         from '@fortawesome/react-fontawesome';

import {forbidExtraProps}            from 'airbnb-prop-types';
import axios                         from 'axios';
import PropTypes                     from 'prop-types';
import React, {useContext, useState} from 'react';
import Button                        from 'react-bootstrap/Button';
import Card                          from 'react-bootstrap/Card';
import Col                           from 'react-bootstrap/Col';
import Container                     from 'react-bootstrap/Container';
import Row                           from 'react-bootstrap/Row';
import {useQuery}                    from 'react-query';
import {useParams}                   from 'react-router-dom';
import UserContext                   from '../../context/userContext';

import GoogleAd                  from '../GoogleAd';
import BlueprintInfoPanel        from './BlueprintInfoPanel';
import BlueprintMarkdown         from './BlueprintMarkdown';
import BlueprintStringCard       from './BlueprintStringCard';
import BlueprintTitle            from './BlueprintTitle';
import BlueprintTitles           from './BlueprintTitles';
import CopyBlueprintStringButton from './CopyBlueprintButton';
import FavoriteButton            from './FavoriteButton';
import FbeLink                   from './FbeLink';
import ImgurThumbnail            from './ImgurThumbnail';
import RequirementsHistogram     from './RequirementsHistogram';
import TagsPanel                 from './TagsPanel';

function HideButton({text})
{
	return (
		<>
			<FontAwesomeIcon icon={faToggleOn} size='lg' fixedWidth className='text-success' />
			{` ${text}`}
		</>
	);
}

HideButton.propTypes = forbidExtraProps({
	text: PropTypes.string.isRequired,
});

function ShowButton({text})
{
	return (
		<>
			<FontAwesomeIcon icon={faToggleOff} size='lg' fixedWidth />
			{` ${text}`}
		</>
	);
}

ShowButton.propTypes = forbidExtraProps({
	text: PropTypes.string.isRequired,
});

function EfficientSingleBlueprint()
{
	const {blueprintId} = useParams();
	const blueprintKey  = blueprintId;

	const [showBlueprintString, setShowBlueprintString] = useState(false);

	const queryKey = ['blueprintDetails', blueprintKey];

	const result = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintDetails/${blueprintKey}`),
	);

	const {isSuccess, data} = result;

	const user   = useContext(UserContext);
	const userId = user && user.uid;

	const ownedByCurrentUser = isSuccess && userId !== undefined && userId === data.data.author.authorId;

	return (
		<Container>
			<Row>
				<Col md={9}>
					<div className='d-flex mt-4'>
						<BlueprintTitle blueprintKey={blueprintKey} />
					</div>
				</Col>
				<Col md={3} className='d-flex align-items-center justify-content-end'>
					{/*	{(ownedByCurrentUser || isModerator) && this.renderEditButton()}*/}
					{!ownedByCurrentUser && <FavoriteButton blueprintKey={blueprintKey} />}
				</Col>
			</Row>
			<Row>
				<Col md={4}>
					<ImgurThumbnail blueprintKey={blueprintKey} />
					<TagsPanel blueprintKey={blueprintKey} />
					<BlueprintInfoPanel
						blueprintKey={blueprintKey}
						ownedByCurrentUser={ownedByCurrentUser}
					/>
					<RequirementsHistogram blueprintKey={blueprintKey} />
					<GoogleAd />
				</Col>
				<Col md={8}>
					<Card>
						<Card.Header>
							Details
						</Card.Header>
						<Card.Body>
							<BlueprintMarkdown blueprintKey={blueprintKey} />
							<CopyBlueprintStringButton blueprintKey={blueprintKey} />
							<Button type='button' onClick={() => setShowBlueprintString(!showBlueprintString)}>
								{
									showBlueprintString
										? <HideButton text={'Hide Blueprint'} />
										: <ShowButton text={'Show Blueprint'} />
								}
							</Button>
							<FbeLink blueprintKey={blueprintKey} />
						</Card.Body>
					</Card>
					{
						showBlueprintString && <BlueprintStringCard blueprintKey={blueprintKey} />
					}
					<Card>
						<Card.Header>
							Blueprint Titles
						</Card.Header>
						<Card.Body>
							<BlueprintTitles blueprintKey={blueprintKey} />
						</Card.Body>
					</Card>
				</Col>
			</Row>
			{/*<Row className='w-100'>*/}
			{/*	<Disqus.DiscussionEmbed*/}
			{/*		shortname='factorio-blueprints'*/}
			{/*		config={disqusConfig}*/}
			{/*		className='w-100'*/}
			{/*	/>*/}
			{/*</Row>*/}
		</Container>
	);
}

export default EfficientSingleBlueprint;
