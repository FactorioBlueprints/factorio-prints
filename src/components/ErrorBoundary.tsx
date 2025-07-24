import {faExclamationTriangle, faRedo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {type ErrorInfo, type ReactNode} from 'react';

interface ErrorBoundaryProps {
	children: ReactNode;
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
		console.error('ErrorBoundary caught an error:', error, errorInfo);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			return (
				<div className="p-5 rounded-lg jumbotron">
					<h2 className="display-4 text-warning">
						<FontAwesomeIcon icon={faExclamationTriangle} /> Something went wrong
					</h2>
					<details className="mt-3 lead">
						<summary className="btn btn-secondary">View error details</summary>
						<p className="mt-3 text-danger">{this.state.error?.toString()}</p>
						<pre
							className="mt-3 p-3 bg-dark text-light rounded"
							style={{whiteSpace: 'pre-wrap'}}
						>
							<code>{this.state.errorInfo?.componentStack}</code>
						</pre>
					</details>
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
