import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React from 'react';

const FavoriteCount = ({ count, isLoading }) =>
{
	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} spin />;
	}

	return count;
};

FavoriteCount.propTypes = {
	count    : PropTypes.number,
	isLoading: PropTypes.bool.isRequired,
};

export default React.memo(FavoriteCount);
