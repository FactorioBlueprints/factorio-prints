import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import Row from 'react-bootstrap/Row';

interface LoadingIndicatorProps {
	isLoading: boolean;
	message?: string;
}

const LoadingIndicator = ({isLoading, message = 'Loading...'}: LoadingIndicatorProps) => {
	if (!isLoading) return null;

	return (
		<Row className="justify-content-center my-5">
			<div className="text-center">
				<FontAwesomeIcon
					icon={faCog}
					spin
					size="3x"
				/>
				<h3 className="mt-3">{message}</h3>
			</div>
		</Row>
	);
};

export default LoadingIndicator;
