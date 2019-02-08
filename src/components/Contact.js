import {faReddit, faDiscord}  from '@fortawesome/free-brands-svg-icons';
import {faEnvelope}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import React, {PureComponent} from 'react';
import Jumbotron              from 'react-bootstrap/Jumbotron';

class Contact extends PureComponent
{
	render()
	{
		return (
			<Jumbotron fluid>
				<h1 className='display-4'>
					Contact me
				</h1>
				<p className='lead'>
					<FontAwesomeIcon icon={faEnvelope} size='lg' fixedWidth />
					<a
						target='_blank'
						rel='noopener noreferrer'
						href='mailto:factorio.prints@gmail.com'
					>
						{' factorio dot prints at gmail dot com'}
					</a>
				</p>
				<p className='lead'>
					<FontAwesomeIcon icon={faReddit} size='lg' fixedWidth />
					<a
						target='_blank'
						rel='noopener noreferrer'
						href='https://www.reddit.com/user/FactorioBlueprints/'
					>
						{' /u/FactorioBlueprints'}
					</a>
				</p>
				<p className='lead'>
					<FontAwesomeIcon icon={faDiscord} size='lg' fixedWidth />
					{' FactorioBlueprints#7181'}
				</p>
				<p className='lead'>
					Please reach out with any feedback, especially to report bugs!
				</p>
			</Jumbotron>
		);
	}
}

export default Contact;
