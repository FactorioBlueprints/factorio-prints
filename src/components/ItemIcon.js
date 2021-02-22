import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import entitiesWithIcons  from '../data/entitiesWithIcons';

ItemIcon.propTypes = forbidExtraProps({
	item: PropTypes.string.isRequired,
});

function ItemIcon({item})
{
	return (
		<span className={`icon item-icon icon-${item}`}>
			{
				entitiesWithIcons[item]
					? <img height={'32px'} width={'32px'} src={`/icons/${item}.png`} alt={item} />
					: ''
			}
		</span>
	);
}

export default ItemIcon;
