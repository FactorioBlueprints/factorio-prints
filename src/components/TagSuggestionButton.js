import {faTag}                from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Button                 from 'react-bootstrap/lib/Button';
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
				<FontAwesomeIcon icon={faTag} />
				{' '}
				{this.props.tagSuggestion}
			</Button>
		);
	}
}
