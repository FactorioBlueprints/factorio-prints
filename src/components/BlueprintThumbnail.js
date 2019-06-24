import {faHeart}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import React              from 'react';
import Card               from 'react-bootstrap/Card';
import OverlayTrigger     from 'react-bootstrap/OverlayTrigger';
import Tooltip            from 'react-bootstrap/Tooltip';
import {Link}             from 'react-router-dom';

import buildImageUrl              from '../helpers/buildImageUrl';
import BlueprintSummaryProjection from '../propTypes/BlueprintSummaryProjection';
import myPropTypes                from '../propTypes/myPropTypes';

const BlueprintThumbnail = ({blueprintSummary, my}) =>
{
	const {key, title, imgurImage: {imgurId, imgurType}, numberOfUpvotes} = blueprintSummary;

	const mine = my.blueprints.data.includes(key);
	const favorite = my.favorites.data.includes(key);

	const tooltip  = (
		<Tooltip>
			{title}
		</Tooltip>
	);
	const imageUrl = buildImageUrl(imgurId, imgurType, 'b');

	const mineStyle     = mine ? 'text-warning' : 'text-default';
	const favoriteStyle = favorite ? 'text-warning' : 'text-default';

	return (
		<Card className='blueprint-thumbnail col-auto' style={{width: '11rem', backgroundColor: '#1c1e22'}}>
			<Link to={`/ui/view/${key}`}>
				<Card.Img variant='top' src={imageUrl} referrerPolicy='no-referrer' />
			</Link>
			<p className='truncate p-1'>
				{`${numberOfUpvotes}`}
				<span className={favoriteStyle}>
					{/* TODO: This heart should be a toggle button */}
					<FontAwesomeIcon icon={faHeart} className='text-error' />
				</span>
				{'  '}
				<OverlayTrigger placement='bottom' overlay={tooltip}>
					<Link to={`/ui/view/${key}`}>
						<span className={mineStyle}>
							{title}
						</span>
					</Link>
				</OverlayTrigger>
			</p>
		</Card>
	);
};

BlueprintThumbnail.propTypes = forbidExtraProps({
	blueprintSummary: BlueprintSummaryProjection,
	my              : myPropTypes,
});

export default BlueprintThumbnail;
