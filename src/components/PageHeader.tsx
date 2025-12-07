import type React from 'react';
import Row from 'react-bootstrap/Row';

interface PageHeaderProps {
	title: React.ReactNode;
}

function PageHeader({title}: PageHeaderProps) {
	return (
		<Row className="justify-content-center">
			<h1 className="display-4">{title}</h1>
		</Row>
	);
}

export default PageHeader;
