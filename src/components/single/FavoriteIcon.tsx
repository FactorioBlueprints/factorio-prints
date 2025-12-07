import {faHeart as regularHeart} from '@fortawesome/free-regular-svg-icons';
import {faHeart}                 from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}         from '@fortawesome/react-fontawesome';
import React                     from 'react';

interface FavoriteIconProps {
	isFavorite?: boolean;
}

function FavoriteIcon({isFavorite}: FavoriteIconProps)
{
	if (isFavorite)
	{
		return <FontAwesomeIcon icon={faHeart} className={'text-warning'} />;
	}

	return <FontAwesomeIcon icon={regularHeart} className={'text-default'} />;
}

export default FavoriteIcon;
