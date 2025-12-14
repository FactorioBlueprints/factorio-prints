import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';

import styles from './FactorioIcon.module.css';

function getUrlType(type) {
	if (type === 'virtual' || type === 'virtual-signal') {
		return 'virtual-signal';
	} else if (type === 'planet') {
		return 'space-location';
	}
	return type;
}

function getQualityNode(quality, inline) {
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

const iconPropType = PropTypes.shape({
	type: PropTypes.string,
	name: PropTypes.string,
	quality: PropTypes.string,
});

FactorioIcon.propTypes = forbidExtraProps({
	icon: iconPropType,
	size: PropTypes.oneOf(['tiny', 'small', 'large']).isRequired,
	inline: PropTypes.bool,
});

function FactorioIcon({icon, size, inline}) {
	const iconType = icon?.type ?? 'item';
	const iconName = icon?.name;
	const iconQuality = icon?.quality;

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
}

Placeholder.propTypes = forbidExtraProps({
	size: PropTypes.oneOf(['tiny', 'small', 'large']).isRequired,
	inline: PropTypes.bool,
});

function Placeholder({size, inline}) {
	const sizeClass = getSizeClass(size);
	const inlineClass = inline ? styles.inline : '';
	const Container = inline ? 'span' : 'div';

	return (
		<Container className={`${styles.parent} ${sizeClass} ${inlineClass}`}>
			<div className={styles.icon} />
		</Container>
	);
}

function getSizeClass(size) {
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

export {FactorioIcon, Placeholder};
export default FactorioIcon;
