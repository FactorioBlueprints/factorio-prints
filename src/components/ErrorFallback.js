import * as Sentry from '@sentry/react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

export function reportErrorToSentry(error, errorInfo) {
	Sentry.captureException(error, {
		tags: {
			component: 'ErrorBoundary',
			errorType: 'UIError',
		},
		extra: {
			componentStack: errorInfo.componentStack,
		},
	});
}

export default function ErrorFallback({error, resetErrorBoundary}) {
	return (
		<Alert
			variant="danger"
			onClose={resetErrorBoundary}
			dismissible
		>
			<Alert.Heading>Something went wrong</Alert.Heading>
			<p>We've encountered an unexpected error. This issue has been automatically reported.</p>
			<details>
				<summary>Technical details</summary>
				<pre style={{fontSize: '0.8em', marginTop: '10px'}}>{error.message}</pre>
			</details>
			<hr />
			<div className="d-flex justify-content-end">
				<Button
					variant="outline-danger"
					onClick={resetErrorBoundary}
				>
					Try again
				</Button>
			</div>
		</Alert>
	);
}
