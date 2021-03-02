import {faCog}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes         from 'prop-types';
import React             from 'react';

LoadingIcon.propTypes = {
	isLoading: PropTypes.bool.isRequired,
};

function LoadingIcon(props)
{
	return props.isLoading
		? <></>
		: <FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />;
}

export default LoadingIcon;
