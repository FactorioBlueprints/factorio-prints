import React from 'react';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';

const NoMatch = () =>
	<Jumbotron>
		<h1>{'404'}</h1>
		<p>{'This is not the webpage you are looking for.'}</p>
	</Jumbotron>;

export default NoMatch;
