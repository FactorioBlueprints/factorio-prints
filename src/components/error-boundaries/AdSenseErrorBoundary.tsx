import * as Sentry from '@sentry/react';
import type React from 'react';
import {ErrorBoundary} from 'react-error-boundary';

interface AdSenseErrorFallbackProps {
	error: Error;
	resetErrorBoundary: () => void;
}

function AdSenseErrorFallback({error}: AdSenseErrorFallbackProps) {
	const isAdSenseError =
		error.message.includes('adsbygoogle') ||
		error.message.includes('googlesyndication') ||
		error.message.includes('TagError');

	Sentry.captureException(error, {
		tags: {
			component: 'AdSenseErrorBoundary',
			errorType: 'Advertisement',
		},
		extra: {
			isAdSenseError,
			errorMessage: error.message,
		},
	});

	// Return empty div - ads should fail silently
	return <div style={{display: 'none'}} />;
}

interface AdSenseErrorBoundaryProps {
	children: React.ReactNode;
}

export default function AdSenseErrorBoundary({children}: AdSenseErrorBoundaryProps) {
	return (
		<ErrorBoundary
			FallbackComponent={AdSenseErrorFallback}
			onError={(error, errorInfo) => {
				console.log('AdSense Error Boundary caught error:', {error, errorInfo});

				// Handle advertisement-related errors
				if (
					error.message.includes('adsbygoogle') ||
					error.message.includes('googlesyndication') ||
					error.message.includes('TagError') ||
					error.message.includes('Failed to fetch')
				) {
					Sentry.captureException(error, {
						tags: {
							component: 'AdSenseErrorBoundary',
							errorType: 'Advertisement',
							adBlocker: error.message.includes('Failed to fetch'),
						},
						extra: {
							componentStack: errorInfo.componentStack,
							userAgent: navigator.userAgent,
						},
					});
				}
			}}
		>
			{children}
		</ErrorBoundary>
	);
}
