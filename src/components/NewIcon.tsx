import React              from 'react';

interface NewIconProps {
	iconName?: string;
	iconType?: string;
}

function NewIcon({iconName, iconType}: NewIconProps)
{
	let resolvedIconType = iconType;
	if (resolvedIconType === 'virtual')
	{
		resolvedIconType = 'virtual-signal';
	}
	if (resolvedIconType === undefined)
	{
		resolvedIconType = 'item';
	}
	const iconClass = `icon-${iconName}`;
	const iconSrc   = `/icons/${resolvedIconType}/${iconName}.png`;

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
