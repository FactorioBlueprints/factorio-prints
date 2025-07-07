import styles from './FactorioIcon.module.css';

export type SignalType = 'item' | 'entity' | 'recipe' | 'virtual' | 'fluid' | 'technology' | 'planet' | 'quality';
export type Quality = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary' | undefined;

interface SignalID {
    name: string;
    type?: SignalType;
    quality?: Quality;
}

function getUrlType(type: SignalType)
{
	if (type === 'virtual')
	{
		return 'virtual-signal';
	}
	else if (type === 'planet')
	{
		return 'space-location';
	}
	return type;
}

interface FactorioIconProps {
    id?: string;
    icon?: SignalID;
    size: 'small' | 'large';
}

function getQualityNode(icon: SignalID)
{
	if (!icon.quality)
	{
		return null;
	}

	return (
		<img
			loading='lazy'
			className={styles.iconQuality}
			src={`https://factorio-icon-cdn.pages.dev/quality/${icon.quality}.webp`}
			alt={icon.quality}
			title={`Quality: ${icon.quality}`}
			data-testid='quality'
			onError={(e) =>
			{
				e.currentTarget.style.display = 'none';
			}}
		/>
	);
}

export const FactorioIcon = ({id, icon, size}: FactorioIconProps) =>
{
	if (!icon)
	{
		return null;
	}

	const type = icon.type ?? 'item';

	const urlType = getUrlType(type);

	const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;

	const qualityNode = getQualityNode(icon);

	return (
		<div
			data-testid='iconParent'
			className={`${styles.iconParent} ${sizeClass}`}
			id={id}
		>
			<img
				data-testid='icon'
				loading='lazy'
				className={styles.icon}
				src={`https://factorio-icon-cdn.pages.dev/${urlType}/${icon.name}.webp`}
				alt={icon.name}
				title={`${type}: ${icon.name}`}
				onError={(e) =>
				{
					e.currentTarget.style.display = 'none';
				}}
			/>
			{qualityNode}
		</div>
	);
};
