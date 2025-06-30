import {forbidExtraProps} from '../utils/propTypes';
import PropTypes          from 'prop-types';
import React              from 'react';
import entitiesWithIcons  from '../data/entitiesWithIcons';

ItemIcon.propTypes = forbidExtraProps({
	item: PropTypes.string,
});

function ItemIcon({item})
{
	const hasIcon   = item !== null && entitiesWithIcons[item];
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
