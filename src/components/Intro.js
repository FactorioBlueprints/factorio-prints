import {forbidExtraProps} from 'airbnb-prop-types';

import isEmpty from 'lodash/isEmpty';

import React, {PureComponent} from 'react';
import Well from 'react-bootstrap/lib/Well';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import * as selectors from '../selectors';

import {userSchema} from '../propTypes';

class Intro extends PureComponent
{
	static propTypes = forbidExtraProps({
		user: userSchema,
	});

	render()
	{
		if (!isEmpty(this.props.user))
		{
			return false;
		}

		return (
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
			</Well>
		);
	}
}

const mapStateToProps = storeState => ({
	user: selectors.getFilteredUser(storeState),
});

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Intro);
