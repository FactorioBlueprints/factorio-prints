import * as Sentry from '@sentry/react';
import type React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import {ErrorBoundary} from 'react-error-boundary';

interface AppErrorFallbackProps {
	error: Error;
	resetErrorBoundary: () => void;
}

function AppErrorFallback({error, resetErrorBoundary}: AppErrorFallbackProps) {
	Sentry.captureException(error, {
		tags: {
			component: 'AppErrorBoundary',
			errorType: 'ApplicationCrash',
		},
		extra: {
			errorMessage: error.message,
			errorStack: error.stack,
		},
	});

	return (
		<Container className="mt-5">
			<Alert variant="danger">
				<Alert.Heading>Oops! Something went wrong</Alert.Heading>
				<p>The application encountered an unexpected error. We've been notified and are working to fix it.</p>
				<hr />
				<div className="d-flex justify-content-between">
					<Button
						variant="outline-danger"
						onClick={() => window.location.reload()}
					>
						Reload Page
					</Button>
					<Button
						variant="danger"
						onClick={resetErrorBoundary}
					>
						Try Again
					</Button>
				</div>
			</Alert>
		</Container>
	);
}

interface AppErrorBoundaryProps {
	children: React.ReactNode;
}

export default function AppErrorBoundary({children}: AppErrorBoundaryProps) {
	return (
		<ErrorBoundary
			FallbackComponent={AppErrorFallback}
			onError={(error, errorInfo) => {
				console.error('Application Error Boundary caught error:', {error, errorInfo});

				Sentry.captureException(error, {
					tags: {
						component: 'AppErrorBoundary',
						errorType: 'ApplicationCrash',
					},
					extra: {
						componentStack: errorInfo.componentStack,
						url: window.location.href,
						userAgent: navigator.userAgent,
					},
				});
			}}
		>
			{children}
		</ErrorBoundary>
	);
}
