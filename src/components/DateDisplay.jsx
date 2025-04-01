import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';

const DateDisplay = ({ date, isLoading }) =>
{
	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} spin />;
	}

	return (
		<span
			title={moment(date).format('dddd, MMMM Do YYYY, h:mm:ss a')}
		>
			{moment(date).fromNow()}
		</span>
	);
};

DateDisplay.propTypes = {
	date     : PropTypes.number,
	isLoading: PropTypes.bool.isRequired,
};

export default React.memo(DateDisplay);
