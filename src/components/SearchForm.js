import {faSearch}             from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Col                    from 'react-bootstrap/lib/Col';
import FormControl            from 'react-bootstrap/lib/FormControl';
import FormGroup              from 'react-bootstrap/lib/FormGroup';
import InputGroup             from 'react-bootstrap/lib/InputGroup';
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
				<FormGroup>
					<InputGroup>
						<FormControl
							type='text'
							placeholder='search titles'
							value={this.props.titleFilter}
							onChange={this.handleSearchString}
							onKeyDown={this.handleKeyDown}
						/>
						<InputGroup.Addon>
							<FontAwesomeIcon icon={faSearch} />
						</InputGroup.Addon>
					</InputGroup>
				</FormGroup>
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
