import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Col from 'react-bootstrap/lib/Col';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import InputGroup from 'react-bootstrap/lib/InputGroup';

import FontAwesome from 'react-fontawesome';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {filterOnTitle} from '../actions/actionCreators';

class SearchForm extends PureComponent
{
	static propTypes = forbidExtraProps({
		filterOnTitle: PropTypes.func.isRequired,
	});

	state = {
		searchString: '',
	};

	handleKeyDown = (event) =>
	{
		if (event.key === 'Escape')
		{
			event.target.select();
		}
	};

	handleSearchString = (event) =>
	{
		event.preventDefault();

		const searchString = event.target.value;
		this.props.filterOnTitle(searchString);
		this.setState({searchString});
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
							value={this.state.searchString}
							onChange={this.handleSearchString}
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

const mapDispatchToProps = dispatch => bindActionCreators({filterOnTitle}, dispatch);
export default connect(undefined, mapDispatchToProps)(SearchForm);
