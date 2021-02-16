import {faHeart as regularHeart}                   from '@fortawesome/free-regular-svg-icons';
import {faExclamationTriangle, faHeart, faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}                           from '@fortawesome/react-fontawesome';

import PropTypes from 'prop-types';
import React     from 'react';

function FavoriteIcon({isLoading, isError, data})
{
	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} className={'text-default'} spin />;
	}

	if (isError)
	{
		return <FontAwesomeIcon icon={faExclamationTriangle} className={'text-default'} />;
	}

	const isFavorite = data && data.data;
	if (isFavorite)
	{
		return <FontAwesomeIcon icon={faHeart} className={'text-warning'} />;
	}

	return <FontAwesomeIcon icon={regularHeart} className={'text-default'} />;
}

FavoriteIcon.propTypes = {
	isLoading: PropTypes.bool.isRequired,
	isError  : PropTypes.bool.isRequired,
	data     : PropTypes.shape({data: PropTypes.bool.isRequired}),
};

export default FavoriteIcon;
