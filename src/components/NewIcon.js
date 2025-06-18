import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';

const CDN_BASE_URL = 'https://factorio-icon-cdn.pages.dev';

function getUrlType(type) {
	if (type === 'virtual' || type === 'virtual-signal') {
		return 'virtual-signal';
	}
	if (type === 'planet') {
		return 'space-location';
	}
	return type;
}

NewIcon.propTypes = forbidExtraProps({
	iconName: PropTypes.string,
	iconType: PropTypes.string,
});

function NewIcon({iconName, iconType}) {
	const urlType = getUrlType(iconType || 'item');
	const iconClass = `icon-${iconName}`;
	const iconSrc = `${CDN_BASE_URL}/${urlType}/${iconName}.webp`;

	return (
		<span className={`icon item-icon ${iconClass}`}>
			{}
			<img
				height="32px"
				width="32px"
				src={iconSrc}
				alt={`${iconName} icon`}
			/>
		</span>
	);
}

export default NewIcon;
