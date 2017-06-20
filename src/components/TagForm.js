import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Col from 'react-bootstrap/lib/Col';
import Row from 'react-bootstrap/lib/Row';

import Select from 'react-select';
import 'react-select/dist/react-select.css';

class TagForm extends PureComponent
{
	static propTypes = {
		tags          : PropTypes.arrayOf(PropTypes.string).isRequired,
		selectedTags  : PropTypes.arrayOf(PropTypes.string).isRequired,
		onTagSelection: PropTypes.func.isRequired,
	};

	render()
	{
		return (
			<Row>
				<Col md={6}>
					<Select
						value={this.props.selectedTags}
						options={this.props.tags.map(value => ({value, label: value}))}
						onChange={this.props.onTagSelection}
						multi
						placeholder='search tags'
					/>
				</Col>
			</Row>
		);
	}
}

export default TagForm;
