import React from 'react';

import Jumbotron from 'react-bootstrap/lib/Jumbotron';

const Intro = () =>
	<Jumbotron>
		<h1>{'Factorio Prints'}</h1>
		<p>
			{'This this a site to share blueprints for the game '}
			<a href='https://www.factorio.com/'>{'Factorio'}</a>
			{'.'}
		</p>
		<p>{'Blueprints can be exported from the game using any of these mods.'}</p>
		<ul>
			<li>
				<a href='https://mods.factorio.com/mods/DaveMcW/blueprint-string'>{'Blueprint String'}</a>
			</li>
			<li>
				<a href='https://mods.factorio.com/mods/Choumiko/Foreman'>{'Foreman'}</a>
			</li>
			<li>
				<a href='https://mods.factorio.com/mods/killkrog/KBlueprints'>{"Killkrog's Blueprint Manager"}</a>
			</li>
		</ul>
	</Jumbotron>;

export default Intro;
