import React from 'react';
import {Helmet} from 'react-helmet';

const NoMatch = () => (
	<>
		<Helmet>
			<title>Factorio Prints: 404</title>
		</Helmet>
		<div className='p-5 rounded-lg jumbotron'>
			<h1 className='display-4'>
				404
			</h1>
			<p className='lead'>
				This is not the webpage you are looking for.
			</p>
		</div>
	</>
);

export default NoMatch;
