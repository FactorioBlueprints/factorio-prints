interface NewIconProps {
	iconName?: string;
	iconType?: string;
}

function NewIcon({iconName, iconType}: NewIconProps) {
	let resolvedIconType = iconType;
	if (resolvedIconType === 'virtual') {
		resolvedIconType = 'virtual-signal';
	}
	if (resolvedIconType === undefined) {
		resolvedIconType = 'item';
	}
	const iconClass = `icon-${iconName}`;
	const iconSrc = `/icons/${resolvedIconType}/${iconName}.png`;

	return (
		<span className={`icon item-icon ${iconClass}`}>
			{/* biome-ignore lint/a11y/useAltText: Decorative icon */}
			<img
				height="32px"
				width="32px"
				src={iconSrc}
				aria-hidden="true"
			/>
		</span>
	);
}

export default NewIcon;
