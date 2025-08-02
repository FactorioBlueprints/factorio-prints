import {faDiscord} from '@fortawesome/free-brands-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {getAuth} from 'firebase/auth';
import type React from 'react';
import {useAuthState} from 'react-firebase-hooks/auth';
import {app} from '../base.js';

const WelcomeBanner: React.FC = () => {
	const [user, loading] = useAuthState(getAuth(app));

	if (loading) {
		return null;
	}

	if (user) {
		return (
			<div
				className="p-4 rounded-lg jumbotron"
				style={{paddingTop: '1.5rem', paddingBottom: '1.5rem'}}
			>
				<h2 className="h4 mb-2">{'🚀 Welcome to Factorio Prints!'}</h2>
				<p
					className="mb-0"
					style={{fontSize: '1rem'}}
				>
					{'Share and discover blueprints for Factorio. '}
					<a
						href="https://discord.gg/uvUUw5a9Qc"
						target="_blank"
						rel="noopener noreferrer"
					>
						<FontAwesomeIcon
							icon={faDiscord}
							size="sm"
							fixedWidth
							className="me-1"
						/>
						{' Join our Discord'}
					</a>
					{' for help and discussions.'}
				</p>
			</div>
		);
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
			<p className="mt-4 mb-0">
				<a
					href="https://discord.gg/uvUUw5a9Qc"
					target="_blank"
					rel="noopener noreferrer"
				>
					<FontAwesomeIcon
						icon={faDiscord}
						size="sm"
						fixedWidth
						className="me-1"
					/>
					{' Join our Discord'}
				</a>
			</p>
		</div>
	);
};

export default WelcomeBanner;
