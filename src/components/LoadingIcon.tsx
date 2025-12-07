import {faCog}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React             from 'react';

interface LoadingIconProps {
	isPending: boolean;
}

function LoadingIcon({isPending}: LoadingIconProps)
{
	return isPending
		? <FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
		: <></>;
}

export default LoadingIcon;
