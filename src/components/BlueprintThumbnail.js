import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Col from 'react-bootstrap/lib/Col';
import OverlayTrigger from 'react-bootstrap/lib/OverlayTrigger';
import Thumbnail from 'react-bootstrap/lib/Thumbnail';
import Tooltip from 'react-bootstrap/lib/Tooltip';
import FontAwesome from 'react-fontawesome';
import {connect} from 'react-redux';
import {Link} from 'react-router-dom';
import buildImageUrl from '../helpers/buildImageUrl';

import * as selectors from '../selectors';

class BlueprintThumbnail extends PureComponent
{
	static propTypes = forbidExtraProps({
		id               : PropTypes.string.isRequired,
		myBlueprints     : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
		myFavorites      : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
		blueprintSummaries           : PropTypes.objectOf(PropTypes.shape(forbidExtraProps({
			title            : PropTypes.string.isRequired,
			imgurId          : PropTypes.string.isRequired,
			imgurType        : PropTypes.string.isRequired,
			numberOfFavorites: PropTypes.number.isRequired,
		})).isRequired),
	});

	render()
	{
		const isFavorite = this.props.myFavorites[this.props.id] === true;
		const isMine = this.props.myBlueprints[this.props.id] === true;
		const blueprintSummary = this.props.blueprintSummaries[this.props.id];
		const {title, numberOfFavorites, imgurId, imgurType} = blueprintSummary;

		const tooltip = <Tooltip id='thumbnail-title-tooltip'>{title}</Tooltip>;
		const imageUrl = buildImageUrl(imgurId, imgurType, 'b');

		const mineStyle = isMine ? 'text-primary' : 'text-default';
		const favoriteStyle = isFavorite ? 'text-primary' : 'text-default';

		return (
			<Col xs={6} sm={6} md={2}>
				<Link to={`/view/${this.props.id}`}>
					<Thumbnail src={imageUrl}>
						<OverlayTrigger placement='bottom' overlay={tooltip}>
							<p className={`truncate ${mineStyle}`}>{title}</p>
						</OverlayTrigger>
						<p>
							<FontAwesome name='heart' className={favoriteStyle} />
							{numberOfFavorites}
						</p>
					</Thumbnail>
				</Link>
			</Col>
		);
	}
}

const mapStateToProps = (storeState) =>
{
	return {
		myBlueprints      : selectors.getMyBlueprints(storeState),
		myFavorites       : selectors.getMyFavorites(storeState),
		blueprintSummaries: selectors.getBlueprintSummariesData(storeState),
	};
};

export default connect(mapStateToProps, {})(BlueprintThumbnail);
