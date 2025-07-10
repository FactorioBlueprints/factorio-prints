import React from 'react';
import Row from 'react-bootstrap/Row';

interface ErrorDisplayProps {
	error: unknown;
	message?: string;
}

const ErrorDisplay = ({error, message = 'There was a problem loading the data.'}: ErrorDisplayProps) => {
	if (!error) return null;

	return (
		<Row className="justify-content-center my-5">
			<div className="col-12 text-center">
				<h3>Error</h3>
				<p>{message}</p>
			</div>
		</Row>
	);
};

export default ErrorDisplay;
