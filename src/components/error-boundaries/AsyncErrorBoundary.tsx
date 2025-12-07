import * as Sentry from '@sentry/react';
import type React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import {ErrorBoundary} from 'react-error-boundary';

interface AsyncErrorFallbackProps {
	error: Error;
	resetErrorBoundary: () => void;
}

function AsyncErrorFallback({error, resetErrorBoundary}: AsyncErrorFallbackProps) {
	const isAsyncError =
		error.message.includes('UnhandledRejection') ||
		error.message.includes('Cannot read properties of null') ||
		error.message.includes('Method not found') ||
		error.message.includes('Connection to Indexed Database');

	Sentry.captureException(error, {
		tags: {
			component: 'AsyncErrorBoundary',
			errorType: 'AsyncOperation',
		},
		extra: {
			isAsyncError,
			errorMessage: error.message,
		},
	});

	return (
		<Alert
			variant="info"
			onClose={resetErrorBoundary}
			dismissible
		>
			<Alert.Heading>Loading Issue</Alert.Heading>
			<p>We're having trouble loading some data. Please try again.</p>
			<div className="d-flex justify-content-end">
				<Button
					variant="outline-info"
					onClick={resetErrorBoundary}
				>
					Retry
				</Button>
			</div>
		</Alert>
	);
}

interface AsyncErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<AsyncErrorFallbackProps>;
}

export default function AsyncErrorBoundary({children, fallback}: AsyncErrorBoundaryProps) {
	return (
		<ErrorBoundary
			FallbackComponent={fallback || AsyncErrorFallback}
			onError={(error, errorInfo) => {
				console.log('Async Error Boundary caught error:', {error, errorInfo});

				// Handle async operation errors
				if (
					error.message.includes('UnhandledRejection') ||
					error.message.includes('Cannot read properties of null') ||
					error.message.includes('Method not found') ||
					error.message.includes('Connection to Indexed Database')
				) {
					Sentry.captureException(error, {
						tags: {
							component: 'AsyncErrorBoundary',
							errorType: 'AsyncOperation',
						},
						extra: {
							componentStack: errorInfo.componentStack,
						},
					});
				}
			}}
		>
			{children}
		</ErrorBoundary>
	);
}
