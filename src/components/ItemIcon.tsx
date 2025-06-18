import entitiesWithIcons from '../data/entitiesWithIcons';
import {Placeholder} from './core/icons/FactorioIcon';

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

	const iconClass = `icon-${item}`;
	const iconSrc = `/icons/${item}.png`;
	const alt = `${item}`;

	return (
		<span className={`icon item-icon ${iconClass}`}>
			<img
				height="32px"
				width="32px"
				src={iconSrc}
				alt={alt}
			/>
		</span>
	);
}

export default ItemIcon;
