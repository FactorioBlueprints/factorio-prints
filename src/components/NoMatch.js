import React from 'react';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import DocumentTitle from 'react-document-title';

const NoMatch = () => (
	<DocumentTitle title='Factorio Prints: 404'>
		<Jumbotron>
			<h1>{'404'}</h1>
			<p>{'This is not the webpage you are looking for.'}</p>
		</Jumbotron>
	</DocumentTitle>
);

export default NoMatch;
