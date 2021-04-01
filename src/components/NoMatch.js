import React         from 'react';
import Jumbotron     from 'react-bootstrap/Jumbotron';
import DocumentTitle from 'react-document-title';

function NoMatch()
{
	return (
		<DocumentTitle title='Factorio Prints: 404'>
			<Jumbotron>
				<h1 className='display-4'>
					404
				</h1>
				<p className='lead'>
					Not found.
				</p>
			</Jumbotron>
		</DocumentTitle>
	);
}

export default NoMatch;
