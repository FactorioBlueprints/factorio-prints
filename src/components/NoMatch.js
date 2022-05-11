import React         from 'react';
import DocumentTitle from 'react-document-title';

function NoMatch()
{
	return (
		<DocumentTitle title='Factorio Prints: 404'>
			<div className="p-5 rounded-lg jumbotron">
				<h1 className='display-4'>
					404
				</h1>
				<p className='lead'>
					Not found.
				</p>
			</div>
		</DocumentTitle>
	);
}

export default NoMatch;
