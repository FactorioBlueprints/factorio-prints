import {faDiscord, faGithub, faReddit} from '@fortawesome/free-brands-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';

function Chat(): React.ReactElement {
	return (
		<div className="p-5 rounded-lg jumbotron">
			<p className="lead">
				<FontAwesomeIcon
					icon={faDiscord}
					size="lg"
					fixedWidth
				/>
				{' Discord: '}
				<a
					target="_blank"
					rel="noopener noreferrer"
					href=" https://discord.gg/uvUUw5a9Qc "
				>
					{'Server Invitation'}
				</a>
			</p>
			<p className="lead">
				<FontAwesomeIcon
					icon={faReddit}
					size="lg"
					fixedWidth
				/>
				{' Reddit: User '}
				<a
					target="_blank"
					rel="noopener noreferrer"
					href="https://www.reddit.com/user/FactorioBlueprints/"
				>
					{'/u/FactorioBlueprints'}
				</a>
			</p>
			<p className="lead">
				<FontAwesomeIcon
					icon={faGithub}
					size="lg"
					fixedWidth
				/>
				{' GitHub: Issues '}
				<a
					target="_blank"
					rel="noopener noreferrer"
					href="https://github.com/FactorioBlueprints/factorio-prints/issues"
				>
					{'FactorioBlueprints/factorio-prints'}
				</a>
			</p>
		</div>
	);
}

export default Chat;
