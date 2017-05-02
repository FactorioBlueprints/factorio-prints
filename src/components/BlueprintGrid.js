import React, {Component, PropTypes} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';

import get from 'lodash/get';

import BlueprintThumbnail from './BlueprintThumbnail';

import base from '../base';

class BlueprintGrid extends Component
{
	static propTypes = {
		blueprintSummaries: PropTypes.object.isRequired,
		userFavorites     : PropTypes.object.isRequired,
		user              : PropTypes.shape({
			userId: PropTypes.string.isRequired,
		}),
	};

	state = {
		blueprints: {},
		loading   : true,
	};

	componentWillMount()
	{
		this.syncState(this.props);
	}

	componentWillReceiveProps(nextProps)
	{
		const oldUserId = get(this.props, 'user.userId');
		const newUserId = get(nextProps, 'user.userId');
		if (oldUserId !== newUserId)
		{
			this.syncState(nextProps);
		}
	}

	componentWillUnmount()
	{
		if (this.blueprintsRef)
		{
			base.removeBinding(this.blueprintsRef);
		}
	}

	syncState = (props) =>
	{
		if (this.blueprintsRef)
		{
			base.removeBinding(this.blueprintsRef);
		}

		if (props.user)
		{
			this.blueprintsRef = base.syncState(`/users/${props.user.userId}/blueprints`, {
				context  : this,
				state    : 'blueprints',
				then     : () => this.setState({loading: false}),
				onFailure: () => this.setState({loading: false}),
			});
		}
	};

	render()
	{
		return <Grid>
			<Row>
				<PageHeader>{'Viewing Most Recent'}</PageHeader>
			</Row>
			<Row>
				{
					Object.keys(this.props.blueprintSummaries).reverse().map((key) =>
					{
						const isMine = this.state.blueprints[key] === true;
						return (
							<BlueprintThumbnail
								key={key}
								id={key}
								isFavorite={this.props.userFavorites[key] === true}
								isMine={isMine}
								{...this.props.blueprintSummaries[key]}
							/>);
					})
				}
			</Row>
		</Grid>;
	}
}

export default BlueprintGrid;
