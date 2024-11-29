import {faDonate} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import Alert                  from 'react-bootstrap/Alert';

import React from 'react';

const contributors = [
    'Pepzi',
    'Earthwalker',
    'wisefish',
    // J***** *******
    'Tomáš Hubka',
    'Clive Blackledge',
    'Howard F.',
    'faunris',
    // P****
    'ensoniq2k',
    'MercenaryIII', // C**** *****
    // D*****
    'Joel Beland',
    'Riley',
    'Roger Booth',
    'Thomas',
]

function Contributors()
{
	return (
		<div className='p-5 rounded-lg jumbotron'>
			<h1 className='display-4'>
				{'Thank you to our contributors!'}
			</h1>
			<Alert  variant='primary'>
				<p>
					{'Their contributions go toward the significant hosting costs, and help keep this site running.'}
				</p>
				<p className='lead'>
					<FontAwesomeIcon
						icon={faDonate}
						size='lg'
						fixedWidth
						className={'text-warning'}
					/> <a href='https://www.patreon.com/FactorioBlueprints'>patreon.com/FactorioBlueprints</a>
				</p>
			</Alert>
			{
				contributors.map(contributor => (
					<p className='lead' key={contributor}>
						• {contributor}
					</p>
				))
			}
		</div>
	);
}

export default Contributors;
