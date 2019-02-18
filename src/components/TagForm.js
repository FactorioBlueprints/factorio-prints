import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';

import Col       from 'react-bootstrap/Col';
import {connect} from 'react-redux';

import Select               from 'react-select';
import 'react-select/dist/react-select.css';
import {bindActionCreators} from 'redux';

import {filterOnTags, subscribeToTag, subscribeToTags} from '../actions/actionCreators';

class TagForm extends PureComponent
{
	static propTypes = forbidExtraProps({
		tags           : PropTypes.arrayOf(PropTypes.string).isRequired,
		filteredTags   : PropTypes.arrayOf(PropTypes.string).isRequired,
		subscribeToTag : PropTypes.func.isRequired,
		subscribeToTags: PropTypes.func.isRequired,
		filterOnTags   : PropTypes.func.isRequired,
	});

	UNSAFE_componentWillMount()
	{
		this.props.subscribeToTags();
	}

	handleTagSelection = (filteredTags) =>
	{
		const filteredTagStrings = filteredTags.map(each => each.value);
		filteredTagStrings.forEach(this.props.subscribeToTag);
		this.props.filterOnTags(filteredTagStrings);
	};

	render()
	{
		return (
			<Col md={6}>
				<Select
					value={this.props.filteredTags}
					options={this.props.tags.map(value => ({value, label: value}))}
					onChange={this.handleTagSelection}
					multi
					placeholder='search tags'
					className='tag-form'
				/>
			</Col>
		);
	}
}

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
