import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import Button from 'react-bootstrap/lib/Button';
import FontAwesome from 'react-fontawesome';
import 'react-select/dist/react-select.css';

export default class TagSuggestionButton extends PureComponent
{
	static propTypes = forbidExtraProps({
		tagSuggestion: PropTypes.string.isRequired,
		addTag       : PropTypes.func.isRequired,
	});

	handleClick = () =>
	{
		this.props.addTag(this.props.tagSuggestion);
	};

	render()
	{
		return (
			<Button
				bsStyle='primary'
				onClick={this.handleClick}
			>
				<FontAwesome name='tag' />
				{' '}
				{this.props.tagSuggestion}
			</Button>
		);
	}
}
