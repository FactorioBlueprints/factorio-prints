import React from 'react';
import DocumentTitle from 'react-document-title';

const NoMatch = () => (
	<DocumentTitle title='Factorio Prints: 404'>
		<div className='p-5 rounded-lg jumbotron'>
			<h1 className='display-4'>
				404
			</h1>
			<p className='lead'>
				This is not the webpage you are looking for.
			</p>
		</div>
	</DocumentTitle>
);

export default NoMatch;
