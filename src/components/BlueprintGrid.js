import React, {Component, PropTypes} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';

import BlueprintThumbnail from './BlueprintThumbnail';

class BlueprintGrid extends Component
{
	static propTypes = {
		blueprintSummaries: PropTypes.object.isRequired,
		userFavorites     : PropTypes.object.isRequired,
	};

	render()
	{
		return <Grid>
			<Row>
				<PageHeader>{'Viewing Most Recent'}</PageHeader>
			</Row>
			<Row>
				{
					Object.keys(this.props.blueprintSummaries).reverse().map(key =>
						<BlueprintThumbnail key={key} id={key} isFavorite={this.props.userFavorites[key] === true} {...this.props.blueprintSummaries[key]} />)
				}
			</Row>
		</Grid>;
	}
}

export default BlueprintGrid;
