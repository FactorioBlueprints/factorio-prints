import {faDonate, faHeart} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type React from 'react';
import Alert from 'react-bootstrap/Alert';
import Container from 'react-bootstrap/Container';

const contributors = [
	'Pepzi',
	'Earthwalker',
	'wisefish',
	'Tomáš Hubka',
	'Clive Blackledge',
	'Howard F.',
	'faunris',
	'ensoniq2k',
	'MercenaryIII',
	'Joel Beland',
	'Riley',
	'Roger Booth',
	'Thomas',
];

const Contributors: React.FC = () => {
	return (
		<Container>
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">
					<FontAwesomeIcon
						icon={faHeart}
						className="text-danger"
					/>{' '}
					Thank you to our contributors!
				</h1>
				<Alert variant="primary">
					<p>Their contributions go toward the significant hosting costs, and help keep this site running.</p>
					<p className="lead">
						<FontAwesomeIcon
							icon={faDonate}
							size="lg"
							fixedWidth
							className="text-warning"
						/>{' '}
						<a
							href="https://www.patreon.com/FactorioBlueprints"
							target="_blank"
							rel="noopener noreferrer"
						>
							patreon.com/FactorioBlueprints
						</a>
					</p>
				</Alert>
				{contributors.map((contributor) => (
					<p
						className="lead"
						key={contributor}
					>
						• {contributor}
					</p>
				))}
			</div>
		</Container>
	);
};

export default Contributors;
