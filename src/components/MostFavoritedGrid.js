import React, {Component, PropTypes} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import PageHeader from 'react-bootstrap/lib/PageHeader';

import BlueprintThumbnail from './BlueprintThumbnail';

class MostFavoritedGrid extends Component {
	static propTypes = {blueprintSummaries: PropTypes.object.isRequired};

	compareNumberOfFavorites = (a, b) =>
	{
		const numberOfFavoritesA = this.props.blueprintSummaries[a].numberOfFavorites;
		const numberOfFavoritesB = this.props.blueprintSummaries[b].numberOfFavorites;
		if (numberOfFavoritesA < numberOfFavoritesB)
		{
			return 1;
		}
		if (numberOfFavoritesA > numberOfFavoritesB)
		{
			return -1;
		}
		return 0;
	};

	render()
	{
		return <Grid>
			<Row>
				<PageHeader>{'Viewing Most Favorited'}</PageHeader>
			</Row>
			<Row>
				{
					Object.keys(this.props.blueprintSummaries)
						.filter(key => this.props.blueprintSummaries[key].numberOfFavorites > 0)
						.sort(this.compareNumberOfFavorites)
						.map(key =>
							<BlueprintThumbnail
								key={key}
								id={key}
								{...this.props.blueprintSummaries[key]}
							/>)
				}
			</Row>
		</Grid>;
	}
}

export default MostFavoritedGrid;
