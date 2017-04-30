import React, {Component, PropTypes} from 'react';

import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';
import Jumbotron from 'react-bootstrap/lib/Jumbotron';

import BlueprintThumbnail from './BlueprintThumbnail';
import NoMatch from './NoMatch';

import FontAwesome from 'react-fontawesome';
import isEmpty from 'lodash/isEmpty';

import base from '../base';

class UserGrid extends Component
{
	static propTypes = {
		id                : PropTypes.string.isRequired,
		blueprintSummaries: PropTypes.object.isRequired,
	};

	state = {
		user   : {},
		loading: true,
	};

	componentWillMount()
	{
		this.syncState(this.props);
	}

	componentWillReceiveProps(nextProps)
	{
		this.syncState(nextProps);
	}

	componentWillUnmount()
	{
		base.removeBinding(this.ref);
	}

	syncState = (props) =>
	{
		if (this.ref)
		{
			base.removeBinding(this.ref);
		}

		this.ref = base.syncState(`/users/${props.id}/`, {
			context  : this,
			state    : 'user',
			then     : () => this.setState({loading: false}),
			onFailure: () => this.setState({loading: false}),
		});
	};

	render()
	{
		if (this.state.loading)
		{
			return <Jumbotron>
				<h1>
					<FontAwesome name='cog' spin />
					{' Loading data'}
				</h1>
			</Jumbotron>;
		}

		const {user} = this.state;
		if (isEmpty(user))
		{
			return <NoMatch />;
		}

		return (
			<Grid>
				<Row>
					<PageHeader>
						{'Viewing Blueprints by '}{this.state.user.displayName || '(Anonymous)'}
					</PageHeader>
				</Row>
				<Row>
					{
						Object.keys(this.state.user.blueprints || {}).map(key =>
							<BlueprintThumbnail
								key={key}
								id={key}
								{...this.props.blueprintSummaries[key]}
							/>)
					}
				</Row>
			</Grid>
		);
	}
}

export default UserGrid;
