import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {filterOnTags, subscribeToTags} from '../actions/actionCreators';
import EfficientTagForm                from './search/EfficientTagForm';

class TagForm extends PureComponent
{
	static propTypes = forbidExtraProps({
		tags           : PropTypes.arrayOf(PropTypes.string).isRequired,
		filteredTags   : PropTypes.arrayOf(PropTypes.string).isRequired,
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
		this.props.filterOnTags(filteredTagStrings);
	};

	render()
	{
		return (
			<EfficientTagForm />
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
	const actionCreators = {subscribeToTags, filterOnTags};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(TagForm);
