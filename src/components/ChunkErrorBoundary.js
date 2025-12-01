import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import {isChunkLoadError} from '../utils/errorFiltering';

/**
 * ErrorBoundary specifically for catching chunk load errors on lazy-loaded routes.
 * Shows a user-friendly message and refresh button when chunks fail to load
 * due to stale deployments.
 *
 * Non-chunk errors are re-thrown to be handled by parent error boundaries
 * or the global error handler.
 */
class ChunkErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = {hasChunkError: false};
	}

	static getDerivedStateFromError(error) {
		if (isChunkLoadError(error)) {
			return {hasChunkError: true};
		}
		return null;
	}

	componentDidCatch(error, _errorInfo) {
		if (!isChunkLoadError(error)) {
			throw error;
		}
	}

	render() {
		if (this.state.hasChunkError) {
			return (
				<Alert
					variant="info"
					className="m-3"
				>
					<Alert.Heading>A new version is available</Alert.Heading>
					<p>The application has been updated. Please refresh to load the latest version.</p>
					<Button
						variant="primary"
						onClick={() => window.location.reload()}
					>
						Refresh Now
					</Button>
				</Alert>
			);
		}

		return this.props.children;
	}
}

export default ChunkErrorBoundary;
