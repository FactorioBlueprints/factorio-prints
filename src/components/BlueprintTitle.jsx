import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React from 'react';

const BlueprintTitle = ({ title, isLoading }) =>
{
	if (isLoading)
	{
		return <h1><FontAwesomeIcon icon={faCog} spin /></h1>;
	}

	return <h1>{title}</h1>;
};

BlueprintTitle.propTypes = {
	title    : PropTypes.string,
	isLoading: PropTypes.bool.isRequired,
};

export default React.memo(BlueprintTitle);
