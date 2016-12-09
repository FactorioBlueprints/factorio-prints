import React, {Component, PropTypes} from 'react';

import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';

import BlueprintThumbnail from './BlueprintThumbnail';
import base from '../base';

class UserGrid extends Component {
	static propTypes = {
		id        : PropTypes.string.isRequired,
		blueprints: PropTypes.object.isRequired,
	};

	state = {
		keys       : {},
		displayName: '',
	};

	componentWillMount()
	{
		const ref = base.database().ref(`/users/${this.props.id}/displayName`);
		ref.once('value').then((snapshot) =>
		{
			this.setState({displayName: snapshot.val()});
		});
		this.ref = base.syncState(`/users/${this.props.id}/blueprints/`, {
			context: this,
			state  : 'keys',
		});
	}

	componentWillUnmount()
	{
		base.removeBinding(this.ref);
	}

	render()
	{
		return (
			<Grid>
				<Row>
					<PageHeader>
						{'Blueprints by '}{this.state.displayName}
					</PageHeader>
				</Row>
				<Row>
					{
						Object.keys(this.state.keys)
							.map(key => <BlueprintThumbnail key={key} id={key} {...this.props.blueprints[key]} />)
					}
				</Row>
			</Grid>
		);
	}
}

export default UserGrid;
