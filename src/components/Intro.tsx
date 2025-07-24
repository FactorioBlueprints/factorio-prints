import {getAuth} from 'firebase/auth';
import isEmpty from 'lodash/isEmpty';
import type React from 'react';
import {useAuthState} from 'react-firebase-hooks/auth';
import {app} from '../base.js';

const Intro: React.FC = () => {
	const [user] = useAuthState(getAuth(app));

	if (!isEmpty(user)) {
		return null;
	}

	return (
		<div className="p-5 rounded-lg jumbotron">
			<h1 className="display-4">{'Factorio Prints'}</h1>
			<p className="lead">
				{'This is a site to share blueprints for the game '}
				<a href="https://www.factorio.com/">{'Factorio'}</a>
				{'.'}
			</p>
			<p className="lead">
				{'Blueprints can be exported from the game using the in-game blueprint manager.'}
				{' ['}
				<a href="https://www.youtube.com/watch?v=7FD4Gehe29E">{'Video Tutorial'}</a>
				{']'}
			</p>
		</div>
	);
};

export default Intro;
