import entitiesWithIcons from '../data/entitiesWithIcons';
import {Placeholder} from './core/icons/FactorioIcon';

const CDN_BASE_URL = 'https://factorio-icon-cdn.pages.dev';

interface ItemIconProps {
	item?: string;
}

function ItemIcon({item}: ItemIconProps) {
	const hasIcon = item !== null && item !== undefined && (entitiesWithIcons as Record<string, boolean>)[item];

	if (!hasIcon) {
		return (
			<Placeholder
				size="small"
				inline
			/>
		);
	}

	return (
		<span className={`icon item-icon icon-${item}`}>
			<img
				height="32px"
				width="32px"
				src={`${CDN_BASE_URL}/item/${item}.webp`}
				alt={item}
			/>
		</span>
	);
}

export default ItemIcon;
