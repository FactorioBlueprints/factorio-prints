import {useRouter} from '@tanstack/react-router';
import type React from 'react';

const NoMatch: React.FC = () => {
	const router = useRouter();
	const pathname = router.state.location.pathname;

	return (
		<div className="p-5 rounded-lg jumbotron">
			<title>Factorio Prints: 404</title>
			<h1 className="display-4">404</h1>
			<p className="lead">This is not the webpage you are looking for.</p>
			<p>Path: {pathname}</p>
		</div>
	);
};

export default NoMatch;
