import {forbidExtraProps}  from 'airbnb-prop-types';
import PropTypes           from 'prop-types';
import React, {useEffect}  from 'react';

import Col       from 'react-bootstrap/Col';
import {connect} from 'react-redux';

import Select               from 'react-select';
import {bindActionCreators} from 'redux';

import {filterOnTags, subscribeToTag, subscribeToTags} from '../actions/actionCreators';

const TagForm = ({
	tags,
	filteredTags,
	subscribeToTag,
	subscribeToTags,
	filterOnTags,
}) =>
{
	useEffect(() =>
	{
		subscribeToTags();
	}, [subscribeToTags]);

	const handleTagSelection = (filteredTags) =>
	{
		const filteredTagStrings = filteredTags.map(each => each.value);
		filteredTagStrings.forEach(subscribeToTag);
		filterOnTags(filteredTagStrings);
	};

	return (
		<Col md={6}>
			<Select
				value={filteredTags.map(value => ({value, label: value}))}
				options={tags.map(value => ({value, label: value}))}
				onChange={handleTagSelection}
				isMulti
				placeholder='search tags'
				className='tag-form'
			/>
		</Col>
	);
};

TagForm.propTypes = forbidExtraProps({
	tags           : PropTypes.arrayOf(PropTypes.string).isRequired,
	filteredTags   : PropTypes.arrayOf(PropTypes.string).isRequired,
	subscribeToTag : PropTypes.func.isRequired,
	subscribeToTags: PropTypes.func.isRequired,
	filterOnTags   : PropTypes.func.isRequired,
});

const mapStateToProps = (state) =>
{
	const {tags: {data: tags}, filteredTags} = state;
	return {tags, filteredTags};
};

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {subscribeToTag, subscribeToTags, filterOnTags};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(TagForm);
