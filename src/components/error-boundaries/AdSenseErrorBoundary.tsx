import * as Sentry from '@sentry/react';
import type React from 'react';
import {ErrorBoundary} from 'react-error-boundary';

function AdSenseErrorFallback() {
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
				Sentry.captureException(error, {
					tags: {
						component: 'AdSenseErrorBoundary',
						errorType: 'Advertisement',
					},
					extra: {
						componentStack: errorInfo.componentStack,
					},
				});
			}}
		>
			{children}
		</ErrorBoundary>
	);
}
