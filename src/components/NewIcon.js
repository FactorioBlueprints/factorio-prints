import {forbidExtraProps} from 'airbnb-prop-types';
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
	const alt       = `${iconType}/${iconName}`;

	return (
		<span className={`icon item-icon ${iconClass}`}>
				<img
					height='32px'
					width='32px'
					src={iconSrc}
					alt={alt}
				/>
			</span>
	);
}

export default NewIcon;
