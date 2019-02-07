import {faHeart}              from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Col                    from 'react-bootstrap/lib/Col';
import OverlayTrigger         from 'react-bootstrap/lib/OverlayTrigger';
import Thumbnail              from 'react-bootstrap/lib/Thumbnail';
import Tooltip                from 'react-bootstrap/lib/Tooltip';
import {connect}              from 'react-redux';
import {Link}                 from 'react-router-dom';

import buildImageUrl            from '../helpers/buildImageUrl';
import {blueprintSummarySchema} from '../propTypes';
import * as selectors           from '../selectors';

class BlueprintThumbnail extends PureComponent
{
	static propTypes = forbidExtraProps({
		blueprintSummary: blueprintSummarySchema,
		myBlueprints    : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
		myFavoritesKeys : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
	});

	render()
	{
		const {blueprintSummary, myFavoritesKeys, myBlueprints} = this.props;

		const {key, title, imgurId, imgurType, numberOfFavorites} = blueprintSummary;

		const isFavorite = myFavoritesKeys[key] === true;
		const isMine     = myBlueprints[key] === true;

		const tooltip  = (
			<Tooltip id='thumbnail-title-tooltip'>
				{title}
			</Tooltip>
		);
		const imageUrl = buildImageUrl(imgurId, imgurType, 'b');

		const mineStyle     = isMine ? 'text-primary' : 'text-default';
		const favoriteStyle = isFavorite ? 'text-primary' : 'text-default';

		return (
			<Col xs={6} sm={6} md={2}>
				<Link to={`/view/${key}`}>
					<Thumbnail src={imageUrl}>
						<OverlayTrigger placement='bottom' overlay={tooltip}>
							<p className={`truncate ${mineStyle}`}>
								{title}
							</p>
						</OverlayTrigger>
						<p>
							<FontAwesomeIcon icon={faHeart} className={favoriteStyle} />
							{numberOfFavorites}
						</p>
					</Thumbnail>
				</Link>
			</Col>
		);
	}
}

const mapStateToProps = storeState => ({
	myBlueprints   : selectors.getMyBlueprints(storeState),
	myFavoritesKeys: selectors.getMyFavoritesKeys(storeState),
});

export default connect(mapStateToProps, {})(BlueprintThumbnail);
