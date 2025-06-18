import React, {useState} from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import SearchQuery from './SearchQuery';
import SearchResults from './SearchResults';

function Search() {
	const [searchState, setSearchState] = useState();

	return (
		<>
			<Row>
				<Col md={3}>
					<Container>
						<SearchQuery setSearchState={setSearchState} />
					</Container>
				</Col>
				<Col md={9}>
					<Container>
						<SearchResults searchState={searchState} />
					</Container>
				</Col>
			</Row>
		</>
	);
}

export default Search;
