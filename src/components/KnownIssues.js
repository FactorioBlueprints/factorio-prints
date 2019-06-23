import {faGithub, faReddit} from '@fortawesome/free-brands-svg-icons';
import {FontAwesomeIcon}    from '@fortawesome/react-fontawesome';

import React     from 'react';
import Jumbotron from 'react-bootstrap/Jumbotron';

const KnownIssues = () =>
	(
		<Jumbotron>
			<h1 className='display-4'>
				{'Known issues'}
			</h1>
			<p className='lead'>
				{'There are two known issues with factorioprints.com.'}
				<ol>
					<li>
						<a href='https://github.com/FactorioBlueprints/factorio-prints/issues/27'>
							{'Search is broken'}
						</a>
						{' - it only works within already paginated results.'}
					</li>
					<li>
						{'Embedded '}
						<a href='https://github.com/FactorioBlueprints/factorio-prints/issues/29'>
							{'imgur links are broken.'}
						</a>
					</li>
				</ol>

				{'See discussion of the issues '}
				<a href='https://www.reddit.com/r/factorio/comments/c3pk6w/need_help_with_factorioprintscom/?utm_source=share&utm_medium=web2x'>
					{'on Reddit'}
					<FontAwesomeIcon icon={faReddit} size='lg' fixedWidth />
				</a>
				{' and '}
				<a href='https://github.com/FactorioBlueprints/factorio-prints/issues'>
					{'on GitHub'}
					<FontAwesomeIcon icon={faGithub} size='lg' fixedWidth />
				</a>
			</p>
		</Jumbotron>
	);

export default KnownIssues;
