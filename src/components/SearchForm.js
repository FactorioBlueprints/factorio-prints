import {faSearch}             from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Col                    from 'react-bootstrap/Col';
import Form                   from 'react-bootstrap/Form';
import InputGroup             from 'react-bootstrap/InputGroup';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {filterOnTitle} from '../actions/actionCreators';

class SearchForm extends PureComponent
{
	static propTypes = forbidExtraProps({
		titleFilter  : PropTypes.string.isRequired,
		filterOnTitle: PropTypes.func.isRequired,
	});

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
	};

	render()
	{
		return (
			<Col md={6}>
				<InputGroup size='sm' className='search-form'>
					<Form.Control
						type='text'
						placeholder='search titles'
						value={this.props.titleFilter}
						onChange={this.handleSearchString}
						onKeyDown={this.handleKeyDown}
					/>
					<InputGroup.Append>
						<InputGroup.Text>
							<FontAwesomeIcon icon={faSearch} />
						</InputGroup.Text>
					</InputGroup.Append>
				</InputGroup>
			</Col>
		);
	}
}

const mapStateToProps = (state) =>
{
	const {titleFilter} = state;
	return {titleFilter};
};

const mapDispatchToProps = dispatch => bindActionCreators({filterOnTitle}, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(SearchForm);
