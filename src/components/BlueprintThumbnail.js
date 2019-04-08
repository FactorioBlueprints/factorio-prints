import {faHeart}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Card               from 'react-bootstrap/Card';
import OverlayTrigger     from 'react-bootstrap/OverlayTrigger';
import Tooltip            from 'react-bootstrap/Tooltip';
import {connect}          from 'react-redux';
import {Link}             from 'react-router-dom';

import buildImageUrl              from '../helpers/buildImageUrl';
import BlueprintSummaryProjection from '../propTypes/BlueprintSummaryProjection';
import * as selectors             from '../selectors';

const BlueprintThumbnail = ({blueprintSummary, myFavoritesKeys, myBlueprints}) =>
{
	const {key, title, imgurImage: {imgurId, imgurType}, numberOfUpvotes} = blueprintSummary;

	const isFavorite = myFavoritesKeys[key] === true;
	const isMine     = myBlueprints[key] === true;

	const tooltip  = (
		<Tooltip>
			{title}
		</Tooltip>
	);
	const imageUrl = buildImageUrl(imgurId, imgurType, 'b');

	const mineStyle     = isMine ? 'text-warning' : 'text-default';
	const favoriteStyle = isFavorite ? 'text-warning' : 'text-default';

	return (
		<Card className='blueprint-thumbnail col-auto' style={{width: '11rem', backgroundColor: '#1c1e22'}}>
			<Link to={`/view/${key}`}>
				<Card.Img variant='top' src={imageUrl} />
			</Link>
			<p className='truncate p-1'>
				{`${numberOfUpvotes}`}
				<span className={favoriteStyle}>
					{/* TODO: This heart should be a toggle button */}
					<FontAwesomeIcon icon={faHeart} className='text-error' />
				</span>
				{'  '}
				<OverlayTrigger placement='bottom' overlay={tooltip}>
					<Link to={`/view/${key}`}>
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
	myBlueprints    : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
	myFavoritesKeys : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
});

const mapStateToProps = storeState => ({
	myBlueprints   : selectors.getMyBlueprints(storeState),
	myFavoritesKeys: selectors.getMyFavoritesKeys(storeState),
});

export default connect(mapStateToProps, {})(BlueprintThumbnail);
