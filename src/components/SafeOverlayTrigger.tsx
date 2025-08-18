import React, {Component, type ReactNode, useEffect, useRef} from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import type {OverlayTriggerProps} from 'react-bootstrap/OverlayTrigger';

interface SafeOverlayTriggerProps extends Omit<OverlayTriggerProps, 'children'> {
	children: React.ReactElement;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

class OverlayErrorBoundary extends Component<{children: ReactNode}, ErrorBoundaryState> {
	constructor(props: {children: ReactNode}) {
		super(props);
		this.state = {hasError: false};
	}

	static getDerivedStateFromError(): ErrorBoundaryState {
		return {hasError: true};
	}

	componentDidCatch(error: Error): void {
		if (
			error.message &&
			(error.message.includes('insertBefore') ||
				error.message.includes('removeChild') ||
				error.message.includes('appendChild'))
		) {
			console.warn('Tooltip DOM manipulation error caught:', error.message);
		}
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return this.props.children;
		}
		return this.props.children;
	}
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
						if (tooltip.parentNode && document.body.contains(tooltip)) {
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
					try {
						const rect = tooltip.getBoundingClientRect();
						if (
							rect.width === 0 &&
							rect.height === 0 &&
							tooltip.parentNode &&
							!document.body.contains(tooltip)
						) {
							tooltip.classList.remove('show');
							(tooltip as HTMLElement).style.display = 'none';
						}
					} catch {}
				});
			}, 500);
		}
	};

	return (
		<OverlayErrorBoundary>
			<OverlayTrigger
				{...props}
				overlay={overlay}
				rootClose={true}
				onToggle={handleToggle}
			>
				{children}
			</OverlayTrigger>
		</OverlayErrorBoundary>
	);
};

export default SafeOverlayTrigger;
