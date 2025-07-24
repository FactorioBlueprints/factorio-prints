import {faGithub, faReddit} from '@fortawesome/free-brands-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type React from 'react';

const KnownIssues: React.FC = () => (
	<div className="p-5 rounded-lg jumbotron">
		<h1 className="display-4">
			{'Check out '}
			<a href="https://www.factorio.school/">Factorio School</a>
		</h1>
		<p className="lead">
			{
				'Factorio School is a rewrite of Factorio Prints where search works across all blueprints, not just the current page.'
			}
		</p>
		<p className="lead">
			{
				"It is a work in progress. For now, it's in read-only mode. The data from Factorio Prints will be copied to Factorio School no more than once each day."
			}
		</p>
		<p className="lead">
			{"If you'd like to follow along with progress, or help out, please see the discussion of the issues "}
			<a href="https://www.reddit.com/r/factorio/comments/c3pk6w/need_help_with_factorioprintscom/?utm_source=share&utm_medium=web2x">
				{'on Reddit'}
				<FontAwesomeIcon
					icon={faReddit}
					size="lg"
					fixedWidth
				/>
			</a>
			{' and '}
			<a href="https://github.com/FactorioBlueprints/factorio-prints/issues">
				{'on GitHub'}
				<FontAwesomeIcon
					icon={faGithub}
					size="lg"
					fixedWidth
				/>
			</a>
		</p>
	</div>
);

export default KnownIssues;
