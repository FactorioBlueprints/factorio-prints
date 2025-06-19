import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useRouter } from '@tanstack/react-router';

const NoMatch: React.FC = () =>
{
	const router = useRouter();
	const pathname = router.state.location.pathname;

	return (
		<>
			<Helmet>
				<title>
					Factorio Prints: 404
				</title>
			</Helmet>
			<div className='p-5 rounded-lg jumbotron'>
				<h1 className='display-4'>
					404
				</h1>
				<p className='lead'>
					This is not the webpage you are looking for.
				</p>
				<p>
					Path: {pathname}
				</p>
			</div>
		</>
	);
};

export default NoMatch;
