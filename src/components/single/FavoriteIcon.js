import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons';
import {faHeart}                 from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}         from '@fortawesome/react-fontawesome';
import {forbidExtraProps}        from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import React     from 'react';

function FavoriteIcon({isFavorite})
{
	if (isFavorite)
	{
		return <FontAwesomeIcon icon={faHeart} className={'text-warning'} />;
	}

	return <FontAwesomeIcon icon={regularHeart} className={'text-default'} />;
}

FavoriteIcon.propTypes = forbidExtraProps({
	isFavorite: PropTypes.bool,
});

export default FavoriteIcon;
