import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';

import Col from 'react-bootstrap/lib/Col';
import Row from 'react-bootstrap/lib/Row';
import {connect} from 'react-redux';

import Select from 'react-select';
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

	componentWillMount()
	{
		this.props.subscribeToTags();
		this.setState({filteredTags: this.props.filteredTags});
	}

	handleTagSelection = (filteredTags) =>
	{
		const filteredTagStrings = filteredTags.map(each => each.value);
		filteredTagStrings.forEach(this.props.subscribeToTag);
		this.props.filterOnTags(filteredTagStrings);
		this.setState({filteredTags});
	};

	render()
	{
		return (
			<Row>
				<Col md={6}>
					<Select
						value={this.state.filteredTags}
						options={this.props.tags.map(value => ({value, label: value}))}
						onChange={this.handleTagSelection}
						multi
						placeholder='search tags'
					/>
				</Col>
			</Row>
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
