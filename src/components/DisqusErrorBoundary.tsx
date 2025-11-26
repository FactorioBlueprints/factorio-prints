import * as Sentry from '@sentry/react';
import type React from 'react';
import {Component, type ReactNode} from 'react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

/**
 * 🛡️ Check if an error should be suppressed (DOM manipulation or cross-origin errors).
 * These are benign errors caused by Disqus modifying the DOM or cross-origin iframe issues.
 */
function shouldSuppressError(error: Error): boolean {
	const message = error.message || '';

	// Cross-origin errors from Disqus
	if (message.includes('cross-origin frame') || message.includes('Blocked a frame')) {
		return true;
	}

	// DOM manipulation errors (DOMException with code 8 = NOT_FOUND_ERR)
	if (error instanceof DOMException) {
		return (
			error.code === 8 ||
			error.name === 'NotFoundError' ||
			message.includes('removeChild') ||
			message.includes('insertBefore') ||
			message.includes('appendChild')
		);
	}

	// String-based DOM manipulation error detection
	return (
		message.includes("Failed to execute 'removeChild'") ||
		message.includes("Failed to execute 'insertBefore'") ||
		message.includes("Failed to execute 'appendChild'") ||
		message.includes('not a child of this node') ||
		message.includes('NotFoundError')
	);
}

class DisqusErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {hasError: false};
	}

	static getDerivedStateFromError(error: Error): State {
		// 🛡️ Don't show error UI for suppressed errors
		if (shouldSuppressError(error)) {
			return {hasError: false};
		}
		return {hasError: true};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// 🛡️ Silently suppress DOM manipulation and cross-origin errors
		if (shouldSuppressError(error)) {
			if (import.meta.env.DEV) {
				console.warn('🛡️ Disqus error suppressed:', error.message);
			}
			return;
		}

		// Log other errors to Sentry
		Sentry.captureException(error, {
			contexts: {
				react: {
					componentStack: errorInfo.componentStack,
				},
			},
			tags: {
				component: 'DisqusErrorBoundary',
			},
		});
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="alert alert-info">
						<p>Comments are temporarily unavailable.</p>
					</div>
				)
			);
		}

		return this.props.children;
	}
}

export default DisqusErrorBoundary;
