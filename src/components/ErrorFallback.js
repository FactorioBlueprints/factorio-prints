import Alert  from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

export default function ErrorFallback({error, resetError})
{
	return (
		<Alert onClose={resetError} dismissible>
			<h4>Something went wrong:</h4>
			<pre>{error.message}</pre>
			<Button onClick={resetError}>Try again</Button>
		</Alert>
	);
}
