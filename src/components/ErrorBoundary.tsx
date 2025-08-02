import {faExclamationTriangle, faRedo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import * as Sentry from '@sentry/react';
import React, {type ErrorInfo, type ReactNode} from 'react';

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	showDetails?: boolean;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {hasError: false, error: null, errorInfo: null};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {hasError: true, error};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		this.setState({error, errorInfo});

		Sentry.withScope((scope) => {
			scope.setContext('errorBoundary', {
				componentStack: errorInfo.componentStack,
			});
			scope.setLevel('error');
			Sentry.captureException(error);
		});

		if (import.meta.env.DEV) {
			console.error('ErrorBoundary caught an error:', error, errorInfo);
		}
	}

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="p-5 rounded-lg jumbotron">
					<h2 className="display-4 text-warning">
						<FontAwesomeIcon icon={faExclamationTriangle} /> Something went wrong
					</h2>
					{this.props.showDetails !== false && (
						<details className="mt-3 lead">
							<summary className="btn btn-secondary">View error details</summary>
							<p className="mt-3 text-danger">{this.state.error?.toString()}</p>
							{import.meta.env.DEV && (
								<pre
									className="mt-3 p-3 bg-dark text-light rounded"
									style={{whiteSpace: 'pre-wrap'}}
								>
									<code>{this.state.errorInfo?.componentStack}</code>
								</pre>
							)}
						</details>
					)}
					<button
						className="btn btn-warning mt-3"
						onClick={() => window.location.reload()}
					>
						<FontAwesomeIcon icon={faRedo} /> Reload Page
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
