import {forbidExtraProps} from '../utils/propTypes';
import PropTypes          from 'prop-types';
import React              from 'react';

NewIcon.propTypes = forbidExtraProps({
	iconName: PropTypes.string,
	iconType: PropTypes.string,
});

function NewIcon({iconName, iconType})
{
	if (iconType === 'virtual')
	{
		iconType = 'virtual-signal';
	}
	if (iconType === undefined)
	{
		iconType = 'item';
	}
	const iconClass = `icon-${iconName}`;
	const iconSrc   = `/icons/${iconType}/${iconName}.png`;

	return (
		<span className={`icon item-icon ${iconClass}`}>
			{/* eslint-disable-next-line */}
			<img
				height='32px'
				width='32px'
				src={iconSrc}
			/>
		</span>
	);
}

export default NewIcon;
