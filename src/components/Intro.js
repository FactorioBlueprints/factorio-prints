import React from 'react';
import Well from 'react-bootstrap/lib/Well';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';

const Intro = () =>
	<Well>
		<Grid>
			<Row>
				<h1>{'Factorio Prints'}</h1>
				<p>
					{'This is a site to share blueprints for the game '}
					<a href='https://www.factorio.com/'>{'Factorio'}</a>
					{'.'}
				</p>
				<p>
					{'Blueprints can be exported from the game using the in-game blueprint manager.'}
					{' ['}<a href='https://www.youtube.com/watch?v=7FD4Gehe29E'>{'Video Tutorial'}</a>{']'}
				</p>
				<p>
					{'There is also limited support for the 0.14 blueprint mods '}
					<a href='https://mods.factorio.com/mods/DaveMcW/blueprint-string'>{'Blueprint String'}</a>
					{', '}
					<a href='https://mods.factorio.com/mods/Choumiko/Foreman'>{'Foreman'}</a>
					{', and '}
					<a href='https://mods.factorio.com/mods/killkrog/KBlueprints'>{"Killkrog's Blueprint Manager"}</a>
				</p>
			</Row>
		</Grid>
	</Well>;

export default Intro;
