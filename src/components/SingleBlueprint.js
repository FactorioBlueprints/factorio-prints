/* eslint-disable react/no-array-index-key */

import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import {connect}              from 'react-redux';

import * as propTypes           from '../propTypes';
import * as selectors           from '../selectors';
import EfficientSingleBlueprint from './single/EfficientSingleBlueprint';

class SingleBlueprint extends PureComponent
{
	static propTypes = forbidExtraProps({
		id  : PropTypes.string.isRequired,
		user: propTypes.userSchema,
	});

	componentDidMount()
	{
		window.scrollTo(0, 0);
	}

	render()
	{
		return (
			<EfficientSingleBlueprint
				blueprintKey={this.props.id}
				userId={this.props.user?.uid}
			/>
		);
	}
}

const mapStateToProps = (storeState, ownProps) =>
{
	return {
		id  : ownProps.match.params.blueprintId,
		user: selectors.getFilteredUser(storeState),
	};
};

export default connect(mapStateToProps)(SingleBlueprint);

