import {faSearch}         from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Col                from 'react-bootstrap/Col';
import Form               from 'react-bootstrap/Form';
import InputGroup         from 'react-bootstrap/InputGroup';
import {connect}          from 'react-redux';
import {bindActionCreators} from 'redux';

import {filterOnTitle} from '../actions/actionCreators';

const SearchForm = ({titleFilter, filterOnTitle}) =>
{
	const handleKeyDown = (event) =>
	{
		if (event.key === 'Escape')
		{
			event.target.select();
		}
	};

	const handleSearchString = (event) =>
	{
		event.preventDefault();

		const searchString = event.target.value;
		filterOnTitle(searchString);
	};

	return (
		<Col md={6}>
			<InputGroup size='sm' className='search-form'>
				<Form.Control
					type='text'
					placeholder='search titles'
					value={titleFilter}
					onChange={handleSearchString}
					onKeyDown={handleKeyDown}
				/>
				<InputGroup.Text className='py-0 px-2'>
					<FontAwesomeIcon icon={faSearch} size='sm' />
				</InputGroup.Text>
			</InputGroup>
		</Col>
	);
};

SearchForm.propTypes = forbidExtraProps({
	titleFilter  : PropTypes.string.isRequired,
	filterOnTitle: PropTypes.func.isRequired,
});

const mapStateToProps = (state) =>
{
	const {titleFilter} = state;
	return {titleFilter};
};

const mapDispatchToProps = dispatch => bindActionCreators({filterOnTitle}, dispatch);
export default connect(mapStateToProps, mapDispatchToProps)(SearchForm);
