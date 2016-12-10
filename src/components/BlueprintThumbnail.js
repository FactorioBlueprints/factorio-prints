import React, {PropTypes} from 'react';
import Col from 'react-bootstrap/lib/Col';
import Thumbnail from 'react-bootstrap/lib/Thumbnail';
import Glyphicon from 'react-bootstrap/lib/Glyphicon';
import {Link} from 'react-router';
import noImageAvailable from '../gif/No_available_image.gif';

const BlueprintThumbnail = ({
	id,
	imageUrl,
	thumbnail,
	title,
	numberOfFavorites,
}) =>
	<Col xs={6} md={3}>
		<Link to={`/view/${id}`}>
			<Thumbnail src={thumbnail || imageUrl || noImageAvailable} className='blueprintThumbnail'>
				<h4 className='truncate'>{title}</h4>
				<p><Glyphicon glyph='heart' /> {numberOfFavorites}</p>
			</Thumbnail>
		</Link>
	</Col>;

BlueprintThumbnail.propTypes = {
	id               : PropTypes.string.isRequired,
	imageUrl         : PropTypes.string,
	title            : PropTypes.string.isRequired,
	numberOfFavorites: PropTypes.number.isRequired,
};

export default BlueprintThumbnail;
