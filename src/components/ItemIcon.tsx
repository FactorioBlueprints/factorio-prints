import React              from 'react';
import entitiesWithIcons  from '../data/entitiesWithIcons';

interface ItemIconProps {
	item?: string;
}

function ItemIcon({item}: ItemIconProps)
{
	const hasIcon   = item !== null && item !== undefined && (entitiesWithIcons as Record<string, boolean>)[item];
	const iconClass = hasIcon ? `icon-${item}`       : 'icon-blank';
	const iconSrc   = hasIcon ? `/icons/${item}.png` : '/icons/blank.png';
	const alt       = hasIcon ? `${item}`            : 'blank';

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

export default ItemIcon;
