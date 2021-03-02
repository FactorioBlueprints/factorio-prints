import {faHeart as regularHeart}               from '@fortawesome/free-regular-svg-icons';
import {faCog, faExclamationTriangle, faHeart} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}                       from '@fortawesome/react-fontawesome';
import {forbidExtraProps}                      from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import React     from 'react';

function FavoriteIcon({isLoading, isError, isFavorite})
{
	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} className={'text-default'} spin />;
	}

	if (isError)
	{
		return <FontAwesomeIcon icon={faExclamationTriangle} className={'text-default'} />;
	}

	if (isFavorite)
	{
		return <FontAwesomeIcon icon={faHeart} className={'text-warning'} />;
	}

	return <FontAwesomeIcon icon={regularHeart} className={'text-default'} />;
}

FavoriteIcon.propTypes = forbidExtraProps({
	isLoading : PropTypes.bool.isRequired,
	isError   : PropTypes.bool.isRequired,
	isFavorite: PropTypes.bool,
});

export default FavoriteIcon;
