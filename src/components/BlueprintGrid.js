import React, {Component, PropTypes} from 'react';
import Grid from 'react-bootstrap/lib/Grid';
import Row from 'react-bootstrap/lib/Row';
import BlueprintThumbnail from './BlueprintThumbnail';

class BlueprintGrid extends Component {
	static propTypes = {blueprints: PropTypes.object.isRequired};

	render()
	{
		return <Grid>
			<Row>
				{
					Object.keys(this.props.blueprints).map(key =>
						<BlueprintThumbnail key={key} id={key} {...this.props.blueprints[key]} />)
				}
			</Row>
		</Grid>;
	}
}

export default BlueprintGrid;
