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
		displayName: '',
		blueprints : {},
		loading    : true,
	};

	componentWillMount()
	{
		this.syncState(this.props);
	}

	componentWillReceiveProps(nextProps)
	{
		if (this.props.id !== nextProps.id)
		{
			this.syncState(nextProps);
		}
	}

	componentWillUnmount()
	{
		base.removeBinding(this.displayNameRef);
		base.removeBinding(this.blueprintsRef);
	}

	syncState = (props) =>
	{
		if (this.displayNameRef)
		{
			base.removeBinding(this.displayNameRef);
		}

		if (this.blueprintsRef)
		{
			base.removeBinding(this.blueprintsRef);
		}

		this.displayNameRef = base.syncState(`/users/${props.id}/displayName`, {
			context: this,
			state  : 'displayName',
		});

		this.blueprintsRef = base.syncState(`/users/${props.id}/blueprints`, {
			context  : this,
			state    : 'blueprints',
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

		const {blueprints, displayName} = this.state;
		if (isEmpty(blueprints) && isEmpty(displayName))
		{
			return <NoMatch />;
		}

		return (
			<Grid>
				<Row>
					<PageHeader>
						{'Viewing Blueprints by '}{displayName || '(Anonymous)'}
					</PageHeader>
				</Row>
				<Row>
					{
						Object.keys(blueprints || {}).map(key =>
							<BlueprintThumbnail
								key={key}
								id={key}
								isFavorite={false}
								{...this.props.blueprintSummaries[key]}
							/>)
					}
				</Row>
			</Grid>
		);
	}
}

export default UserGrid;
