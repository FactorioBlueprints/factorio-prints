import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';
import React from 'react';

import styles from './FactorioIcon.module.css';

const CDN_BASE_URL = 'https://factorio-icon-cdn.pages.dev';

function getIconUrl(type, name) {
	if (!name) return null;
	const iconType = type || 'item';
	return `${CDN_BASE_URL}/icons/${iconType}/${name}.png`;
}

FactorioIcon.propTypes = forbidExtraProps({
	name: PropTypes.string,
	type: PropTypes.string,
	size: PropTypes.oneOf(['small', 'medium', 'large']),
	inline: PropTypes.bool,
});

function FactorioIcon({name, type = 'item', size = 'medium', inline = false}) {
	const iconUrl = getIconUrl(type, name);

	if (!iconUrl) {
		return <Placeholder size={size} inline={inline} />;
	}

	const classNames = [
		styles.icon,
		styles[size],
		inline ? styles.inline : '',
	].filter(Boolean).join(' ');

	return (
		<span
			className={classNames}
			style={{backgroundImage: `url(${iconUrl})`}}
			title={name}
		/>
	);
}

Placeholder.propTypes = forbidExtraProps({
	size: PropTypes.oneOf(['small', 'medium', 'large']),
	inline: PropTypes.bool,
});

function Placeholder({size = 'medium', inline = false}) {
	const classNames = [
		styles.icon,
		styles[size],
		styles.placeholder,
		inline ? styles.inline : '',
	].filter(Boolean).join(' ');

	return <span className={classNames} />;
}

export {FactorioIcon, Placeholder};
export default FactorioIcon;
