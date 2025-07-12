import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

export default function ErrorFallback({error, resetErrorBoundary}) {
	return (
		<Alert
			onClose={resetErrorBoundary}
			dismissible
		>
			<h4>Something went wrong:</h4>
			<pre>{error.message}</pre>
			<Button onClick={resetErrorBoundary}>Try again</Button>
		</Alert>
	);
}
