import * as Sentry from '@sentry/react';
import type React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import {ErrorBoundary} from 'react-error-boundary';

interface DOMErrorFallbackProps {
	error: Error;
	resetErrorBoundary: () => void;
}

function DOMErrorFallback({error, resetErrorBoundary}: DOMErrorFallbackProps) {
	const isDOMError =
		error.message.includes('insertBefore') ||
		error.message.includes('removeChild') ||
		error.message.includes('appendChild');

	Sentry.captureException(error, {
		tags: {
			component: 'DOMErrorBoundary',
			errorType: 'DOMManipulation',
		},
		extra: {
			isDOMError,
			errorMessage: error.message,
		},
	});

	return (
		<Alert
			variant="warning"
			onClose={resetErrorBoundary}
			dismissible
		>
			<Alert.Heading>Display Issue</Alert.Heading>
			<p>We're having trouble updating the page display. This is usually temporary.</p>
			<div className="d-flex justify-content-end">
				<Button
					variant="outline-warning"
					onClick={resetErrorBoundary}
				>
					Refresh Component
				</Button>
			</div>
		</Alert>
	);
}

interface DOMErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<DOMErrorFallbackProps>;
}

export default function DOMErrorBoundary({children, fallback}: DOMErrorBoundaryProps) {
	return (
		<ErrorBoundary
			FallbackComponent={fallback || DOMErrorFallback}
			onError={(error, errorInfo) => {
				console.log('DOM Error Boundary caught error:', {error, errorInfo});

				// Only handle DOM-related errors
				if (
					error.message.includes('insertBefore') ||
					error.message.includes('removeChild') ||
					error.message.includes('appendChild')
				) {
					Sentry.captureException(error, {
						tags: {
							component: 'DOMErrorBoundary',
							errorType: 'DOMManipulation',
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
