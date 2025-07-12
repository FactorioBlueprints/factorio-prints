import styles from './FactorioIcon.module.css';

export type SignalType =
	| 'item'
	| 'entity'
	| 'recipe'
	| 'virtual'
	| 'fluid'
	| 'technology'
	| 'planet'
	| 'quality'
	| 'virtual-signal'
	| 'equipment'
	| 'achievement'
	| 'space-location'
	| 'asteroid-chunk';
export type Quality = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary' | undefined;

interface SignalID {
	name: string;
	type?: SignalType;
	quality?: Quality;
}

function getUrlType(type: SignalType | string) {
	if (type === 'virtual' || type === 'virtual-signal') {
		return 'virtual-signal';
	} else if (type === 'planet') {
		return 'space-location';
	}
	return type;
}

interface FactorioIconProps {
	id?: string;
	icon?: SignalID;
	type?: SignalType | string;
	name?: string;
	quality?: Quality | string;
	size: 'small' | 'large';
	inline?: boolean;
}

function getQualityNode(quality: Quality | string | undefined, inline?: boolean) {
	if (!quality || quality === 'normal') {
		return null;
	}

	return (
		<img
			loading="lazy"
			className={inline ? styles.iconQualityInline : styles.iconQuality}
			src={`https://factorio-icon-cdn.pages.dev/quality/${quality}.webp`}
			alt={quality}
			title={`Quality: ${quality}`}
			data-testid="quality"
			onError={(e) => {
				e.currentTarget.style.display = 'none';
			}}
		/>
	);
}

export const FactorioIcon = ({id, icon, type, name, quality, size, inline}: FactorioIconProps) => {
	// Support both icon object and separate type/name props
	const iconType = type ?? icon?.type ?? 'item';
	const iconName = name ?? icon?.name;
	const iconQuality = quality ?? icon?.quality;

	if (!iconName) {
		return null;
	}

	const urlType = getUrlType(iconType);

	const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;
	const inlineClass = inline ? styles.inline : '';

	const qualityNode = getQualityNode(iconQuality, inline);

	return (
		<div
			data-testid="iconParent"
			className={`${styles.iconParent} ${sizeClass} ${inlineClass}`}
			id={id}
		>
			<img
				data-testid="icon"
				loading="lazy"
				className={styles.icon}
				src={`https://factorio-icon-cdn.pages.dev/${urlType}/${iconName}.webp`}
				alt={iconName}
				title={`${iconType}: ${iconName}`}
				onError={(e) => {
					e.currentTarget.style.display = 'none';
				}}
			/>
			{qualityNode}
		</div>
	);
};

interface PlaceholderProps {
	size: string;
}

export const Placeholder = ({size}: PlaceholderProps) => {
	const sizeClass = size === 'small' ? styles.smallSquare : styles.largeSquare;

	return (
		<div className={`${styles.iconParent} ${sizeClass}`}>
			<div className={styles.icon} />
		</div>
	);
};
