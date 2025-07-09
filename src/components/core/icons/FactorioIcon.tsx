import styles from './FactorioIcon.module.css';
import type {SignalType, Quality, SignalID} from '../../../types/factorio';

export type {SignalType, Quality, SignalID};
export type IconSize = 'tiny' | 'small' | 'large';

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
	size: IconSize;
	inline?: boolean;
}

function getQualityNode(quality: Quality | string | undefined, inline?: boolean) {
	if (!quality || quality === 'normal') {
		return null;
	}

	return (
		<img
			loading="lazy"
			className={inline ? styles.qualityInline : styles.quality}
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

	const sizeClass = getSizeClass(size);
	const inlineClass = inline ? styles.inline : '';

	const qualityNode = getQualityNode(iconQuality, inline);

	const Container = inline ? 'span' : 'div';

	return (
		<Container
			data-testid="iconParent"
			className={`${styles.parent} ${sizeClass} ${inlineClass}`}
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
		</Container>
	);
};

interface PlaceholderProps {
	size: IconSize;
	inline?: boolean;
}

export const Placeholder = ({size, inline}: PlaceholderProps) => {
	const sizeClass = getSizeClass(size);
	const inlineClass = inline ? styles.inline : '';
	const Container = inline ? 'span' : 'div';

	return (
		<Container className={`${styles.parent} ${sizeClass} ${inlineClass}`}>
			<div className={styles.icon} />
		</Container>
	);
};

function getSizeClass(size: IconSize): string {
	if (size === 'tiny') {
		return styles.tiny;
	}

	if (size === 'small') {
		return styles.small;
	}

	if (size === 'large') {
		return styles.large;
	}

	throw new Error(`Invalid size: ${size}`);
}
