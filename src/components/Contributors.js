import {faDonate} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import Alert                  from 'react-bootstrap/Alert';

import React from 'react';

const contributors = ['wisefish', 'Clive Blackledge', 'ensoniq2k']

function Contributors()
{
	return (
		<div className='p-5 rounded-lg jumbotron'>
			<h1 className='display-4'>
				{'Thank you to our contributors!'}
			</h1>
			{
				contributors.map(contributor => (
					<p className='lead' key={contributor}>
						• {contributor}
					</p>
				))
			}
			<Alert  variant='primary'>
				<p>
					{'Their contributions will go toward hosting costs, and to reducing and removing ads.'}
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
		</div>
	);
}

export default Contributors;
