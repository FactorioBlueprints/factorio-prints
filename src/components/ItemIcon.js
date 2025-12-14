import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import entitiesWithIcons  from '../data/entitiesWithIcons';
import {Placeholder}      from './core/icons/FactorioIcon';

const CDN_BASE_URL = 'https://factorio-icon-cdn.pages.dev';

ItemIcon.propTypes = forbidExtraProps({
	item: PropTypes.string,
});

function ItemIcon({item})
{
	const hasIcon = item !== null && entitiesWithIcons[item];

	if (!hasIcon) {
		return <Placeholder size='small' />;
	}

	return (
		<span className={`icon item-icon icon-${item}`}>
			<img
				height='32px'
				width='32px'
				src={`${CDN_BASE_URL}/item/${item}.webp`}
				alt={item}
			/>
		</span>
	);
}

export default ItemIcon;
