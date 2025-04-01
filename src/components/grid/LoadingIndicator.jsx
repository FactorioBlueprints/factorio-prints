import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React from 'react';
import Row from 'react-bootstrap/Row';

const LoadingIndicator = ({ isLoading, message = 'Loading...' }) =>
{
	if (!isLoading) return null;

	return (
		<Row className='justify-content-center my-5'>
			<div className='text-center'>
				<FontAwesomeIcon icon={faCog} spin size='3x' />
				<h3 className='mt-3'>{message}</h3>
			</div>
		</Row>
	);
};

LoadingIndicator.propTypes = {
	isLoading: PropTypes.bool.isRequired,
	message  : PropTypes.string,
};

export default LoadingIndicator;
