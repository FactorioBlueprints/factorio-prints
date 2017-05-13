import PropTypes from 'prop-types';
import React, { Component } from 'react';

import Col from 'react-bootstrap/lib/Col';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import FormControl from 'react-bootstrap/lib/FormControl';
import InputGroup from 'react-bootstrap/lib/InputGroup';
import Row from 'react-bootstrap/lib/Row';

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
			<Row>
				<Col md={6} mdOffset={3}>
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
			</Row>
		);
	}
}

export default SearchForm;
