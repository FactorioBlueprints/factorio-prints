import React from 'react';
import Row from 'react-bootstrap/Row';

interface PageHeaderProps {
	title: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({title}) => (
	<Row className="blueprint-grid-row justify-content-center">
		<h1 className="display-4">{title}</h1>
	</Row>
);

export default PageHeader;
