import React, {useEffect, useRef} from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import type {OverlayTriggerProps} from 'react-bootstrap/OverlayTrigger';

interface SafeOverlayTriggerProps extends Omit<OverlayTriggerProps, 'children'> {
	children: React.ReactElement;
}

const SafeOverlayTrigger: React.FC<SafeOverlayTriggerProps> = ({children, overlay, ...props}) => {
	const cleanupTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	useEffect(() => {
		// Cleanup function to ensure tooltips are removed
		return () => {
			// Clear any pending timeouts
			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current);
			}

			// Delay cleanup slightly to avoid race conditions with React's unmounting
			cleanupTimeoutRef.current = setTimeout(() => {
				const tooltips = document.querySelectorAll('.tooltip.show, .tooltip.bs-tooltip-auto');
				tooltips.forEach((tooltip) => {
					try {
						// Use React-safe removal
						if (tooltip.parentNode) {
							tooltip.classList.remove('show');
							(tooltip as HTMLElement).style.display = 'none';
							// Allow React to handle the actual removal
							setTimeout(() => {
								if (tooltip.parentNode) {
									tooltip.remove();
								}
							}, 300);
						}
					} catch {
						// Silently handle if already removed
					}
				});
			}, 0);
		};
	}, []);

	// Handle show/hide events to track tooltip state
	const handleToggle = (nextShow: boolean) => {
		if (!nextShow) {
			// Clean up any orphaned tooltips when hiding
			cleanupTimeoutRef.current = setTimeout(() => {
				const tooltips = document.querySelectorAll('.tooltip:not(.show)');
				tooltips.forEach((tooltip) => {
					const rect = tooltip.getBoundingClientRect();
					// Remove tooltips that are not visible
					if (rect.width === 0 && rect.height === 0) {
						try {
							tooltip.remove();
						} catch {
							// Silently handle
						}
					}
				});
			}, 500);
		}
	};

	// Don't wrap in an extra element to preserve original display behavior
	// The cleanup effects will still work without the wrapper
	return (
		<OverlayTrigger
			{...props}
			overlay={overlay}
			rootClose={true}
			onToggle={handleToggle}
		>
			{children}
		</OverlayTrigger>
	);
};

export default SafeOverlayTrigger;
