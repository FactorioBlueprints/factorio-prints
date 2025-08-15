import React, {useEffect, useRef} from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import type {OverlayTriggerProps} from 'react-bootstrap/OverlayTrigger';

interface SafeOverlayTriggerProps extends Omit<OverlayTriggerProps, 'children'> {
	children: React.ReactElement;
}

const SafeOverlayTrigger: React.FC<SafeOverlayTriggerProps> = ({children, overlay, ...props}) => {
	const cleanupTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	useEffect(() => {
		return () => {
			if (cleanupTimeoutRef.current) {
				clearTimeout(cleanupTimeoutRef.current);
			}

			cleanupTimeoutRef.current = setTimeout(() => {
				const tooltips = document.querySelectorAll('.tooltip.show, .tooltip.bs-tooltip-auto');
				tooltips.forEach((tooltip) => {
					try {
						if (tooltip.parentNode) {
							tooltip.classList.remove('show');
							(tooltip as HTMLElement).style.display = 'none';
						}
					} catch {}
				});
			}, 0);
		};
	}, []);

	const handleToggle = (nextShow: boolean) => {
		if (!nextShow) {
			cleanupTimeoutRef.current = setTimeout(() => {
				const tooltips = document.querySelectorAll('.tooltip:not(.show)');
				tooltips.forEach((tooltip) => {
					const rect = tooltip.getBoundingClientRect();
					if (rect.width === 0 && rect.height === 0 && !document.body.contains(tooltip)) {
						try {
							tooltip.classList.remove('show');
							(tooltip as HTMLElement).style.display = 'none';
						} catch {}
					}
				});
			}, 500);
		}
	};

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
