import {forbidExtraProps} from '../utils/propTypes';
import PropTypes from 'prop-types';
import React from 'react';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

const Title = props => (
	<div>
		<FontAwesomeIcon icon={props.icon} size='lg' fixedWidth className={props.className} />
		{` ${props.text}`}
	</div>
);

Title.propTypes = forbidExtraProps({
	icon     : PropTypes.string.isRequired,
	text     : PropTypes.string.isRequired,
	className: PropTypes.string,
});

export default Title;
