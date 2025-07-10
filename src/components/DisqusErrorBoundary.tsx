import React, {Component, ReactNode} from 'react';
import * as Sentry from '@sentry/react';

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

class DisqusErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {hasError: false};
	}

	static getDerivedStateFromError(): State {
		return {hasError: true};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Filter out cross-origin errors from Disqus
		if (error.message?.includes('cross-origin frame') || error.message?.includes('Blocked a frame')) {
			console.warn('Disqus cross-origin error caught and suppressed:', error.message);
			// Don't send these errors to Sentry
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
