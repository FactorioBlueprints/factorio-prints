import React, {PropTypes} from 'react';
import FontAwesome from 'react-fontawesome';

const Title = props =>
	<div>
		<FontAwesome name={props.icon} size='lg' fixedWidth className={props.className} />
		{` ${props.text}`}
	</div>;

Title.propTypes = {
	icon     : PropTypes.string.isRequired,
	text     : PropTypes.string.isRequired,
	className: PropTypes.string,
};

export default Title;
