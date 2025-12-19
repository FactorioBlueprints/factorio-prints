import {faCopy, faEraser, faSpinner} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useMemo, useState} from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

import {useDuplicates} from '../hooks/useDuplicates';
import RestBlueprintThumbnail from './search/RestBlueprintThumbnail';

const DuplicatesGrid: React.FC = () => {
	const {data: duplicates, isLoading, isError, error} = useDuplicates();
	const [searchText, setSearchText] = useState('');

	const filteredDuplicates = useMemo(() => {
		if (!duplicates) {
			return [];
		}
		return duplicates.filter((blueprint) => {
			return searchText === '' || blueprint.title.toLowerCase().includes(searchText.toLowerCase());
		});
	}, [duplicates, searchText]);

	const handleClear = (): void => {
		setSearchText('');
	};

	if (isLoading) {
		return (
			<Container className="text-center p-5">
				<FontAwesomeIcon
					icon={faSpinner}
					spin
					size="3x"
				/>
				<p className="mt-3">Loading duplicates...</p>
			</Container>
		);
	}

	if (isError) {
		return (
			<Container>
				<Alert variant="danger">
					<Alert.Heading>Error Loading Duplicates</Alert.Heading>
					<p>{error instanceof Error ? error.message : 'An error occurred.'}</p>
				</Alert>
			</Container>
		);
	}

	if (!duplicates || duplicates.length === 0) {
		return (
			<Container>
				<Alert variant="info">
					<Alert.Heading>No Duplicates Found</Alert.Heading>
					<p>There are no duplicate blueprints in the database.</p>
				</Alert>
			</Container>
		);
	}

	return (
		<Container>
			<Row className="mb-3">
				<Col>
					<h2>
						<FontAwesomeIcon icon={faCopy} /> Duplicate Blueprints
					</h2>
					<p className="text-muted">
						These blueprints have been detected as duplicates based on their content.
					</p>
				</Col>
			</Row>

			<Card className="mb-3">
				<Card.Body>
					<Row className="g-3 align-items-end">
						<Col md={6}>
							<Form.Group>
								<Form.Label>Search</Form.Label>
								<Form.Control
									type="text"
									placeholder="Filter by title..."
									value={searchText}
									onChange={(event) => setSearchText(event.target.value)}
								/>
							</Form.Group>
						</Col>
						<Col md={6}>
							<Stack
								direction="horizontal"
								gap={2}
							>
								<Button
									variant="outline-secondary"
									onClick={handleClear}
								>
									<FontAwesomeIcon icon={faEraser} /> Clear
								</Button>
								<span className="text-muted">
									Showing {filteredDuplicates.length} of {duplicates.length}
								</span>
							</Stack>
						</Col>
					</Row>
				</Card.Body>
			</Card>

			{filteredDuplicates.length === 0 ? (
				<Alert variant="info">
					<Alert.Heading>No Matches</Alert.Heading>
					<p>No duplicates match your filter criteria.</p>
				</Alert>
			) : (
				<Row className="blueprint-grid justify-content-center g-2">
					{filteredDuplicates.map((blueprint) => (
						<RestBlueprintThumbnail
							key={blueprint.key}
							blueprintSummary={blueprint}
						/>
					))}
				</Row>
			)}
		</Container>
	);
};

export default DuplicatesGrid;
