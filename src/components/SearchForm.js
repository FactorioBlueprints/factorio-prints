import PropTypes from 'prop-types';
import React, {Component} from 'react';

import Col from 'react-bootstrap/lib/Col';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import InputGroup from 'react-bootstrap/lib/InputGroup';

import FontAwesome from 'react-fontawesome';

class SearchForm extends Component
{
	static propTypes = {
		searchString  : PropTypes.string.isRequired,
		onSearchString: PropTypes.func.isRequired,
	};

	handleKeyDown = (event) =>
	{
		if (event.key === 'Escape')
		{
			event.target.select();
		}
	};

	render()
	{
		return (
			<Col md={6}>
				<FormGroup>
					<InputGroup>
						<FormControl
							type='text'
							placeholder='search titles'
							value={this.props.searchString}
							onChange={this.props.onSearchString}
							onKeyDown={this.handleKeyDown}
						/>
						<InputGroup.Addon>
							<FontAwesome name='search' />
						</InputGroup.Addon>
					</InputGroup>
				</FormGroup>
			</Col>
		);
	}
}

export default SearchForm;
