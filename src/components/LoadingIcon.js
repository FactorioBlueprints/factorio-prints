import {faCog}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes         from 'prop-types';
import React             from 'react';

LoadingIcon.propTypes = {
	isPending: PropTypes.bool.isRequired,
};

function LoadingIcon(props)
{
	return props.isPending
		? <FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
		: <></>;
}

export default LoadingIcon;
