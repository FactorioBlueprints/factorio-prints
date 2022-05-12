import {faTag}            from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Button             from 'react-bootstrap/Button';

function TagSuggestionButton({addTag, tagSuggestion})
{
	return (
		<Button
			variant='warning'
			type='button'
			onClick={() => addTag(tagSuggestion)}
		>
			<FontAwesomeIcon icon={faTag} />
			{' '}
			{tagSuggestion}
		</Button>
	);
}

TagSuggestionButton.propTypes = forbidExtraProps({
	tagSuggestion: PropTypes.string.isRequired,
	addTag       : PropTypes.func.isRequired,
});

export default TagSuggestionButton;
