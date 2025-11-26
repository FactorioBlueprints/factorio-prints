import React, {Component, type ReactNode, useEffect, useRef} from 'react';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import type {OverlayTriggerProps} from 'react-bootstrap/OverlayTrigger';

interface SafeOverlayTriggerProps extends Omit<OverlayTriggerProps, 'children'> {
	children: React.ReactElement;
}

interface ErrorBoundaryState {
	hasError: boolean;
}

/** 🛡️ Check if error is a DOM manipulation error from tooltip operations. */
function isDOMManipulationError(error: Error): boolean {
	if (error instanceof DOMException) {
		return (
			error.code === 8 ||
			error.name === 'NotFoundError' ||
			error.message.includes('removeChild') ||
			error.message.includes('insertBefore') ||
			error.message.includes('appendChild')
		);
	}

	const message = error.message || '';
	return (
		message.includes('removeChild') ||
		message.includes('insertBefore') ||
		message.includes('appendChild') ||
		message.includes('not a child of this node')
	);
}

class OverlayErrorBoundary extends Component<{children: ReactNode}, ErrorBoundaryState> {
	constructor(props: {children: ReactNode}) {
		super(props);
		this.state = {hasError: false};
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		// 🛡️ Don't show error state for DOM manipulation errors
		if (isDOMManipulationError(error)) {
			return {hasError: false};
		}
		return {hasError: true};
	}

	componentDidCatch(error: Error): void {
		if (isDOMManipulationError(error)) {
			if (import.meta.env.DEV) {
				console.warn('🛡️ Tooltip DOM manipulation error suppressed:', error.message);
			}
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
							document.body.contains(tooltip)
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
