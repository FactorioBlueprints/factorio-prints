import React from 'react';
import {Helmet} from 'react-helmet';

function NoMatch() {
	return (
		<div className="p-5 rounded-lg jumbotron">
			<Helmet>
				<title>Factorio Prints: 404</title>
			</Helmet>
			<h1 className="display-4">404</h1>
			<p className="lead">Not found.</p>
		</div>
	);
}

export default NoMatch;
