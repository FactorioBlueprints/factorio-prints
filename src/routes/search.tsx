import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

import ErrorBoundary from '../components/ErrorBoundary';
import SearchQueryPanel from '../components/search/SearchQueryPanel';
import SearchResultsGrid from '../components/search/SearchResultsGrid';

export const Route = createFileRoute('/search')({
	component: SearchPage,
});

function SearchPage() {
	return (
		<ErrorBoundary>
			<Container fluid>
				<Row>
					<Col md={3}>
						<SearchQueryPanel />
					</Col>
					<Col md={9}>
						<SearchResultsGrid />
					</Col>
				</Row>
			</Container>
		</ErrorBoundary>
	);
}
