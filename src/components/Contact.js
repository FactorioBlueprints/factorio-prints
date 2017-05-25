import React, {Component} from 'react';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';
import FontAwesome from 'react-fontawesome';

class Contact extends Component
{
	render()
	{
		return (
			<Jumbotron>
				<h1>{'Contact me'}</h1>
				<p>
					<FontAwesome name='envelope' size='lg' fixedWidth />
					<a
						target='_blank'
						rel='noopener noreferrer'
						href='mailto:factorio.prints@gmail.com'>
						{' factorio dot prints at gmail dot com'}
					</a>
				</p>
				<p>
					<FontAwesome name='reddit-alien' size='lg' fixedWidth />
					<a
						target='_blank'
						rel='noopener noreferrer'
						href='https://www.reddit.com/user/FactorioBlueprints/'>
						{' /u/FactorioBlueprints'}
					</a>
				</p>
				<p>{'Please reach out with any feedback, especially to report bugs!'}</p>
			</Jumbotron>
		);
	}
}

export default Contact;
