import {faTag} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import Button from 'react-bootstrap/Button';

interface TagSuggestionButtonProps {
	tagSuggestion: string;
	addTag: (tag: string) => void;
}

function TagSuggestionButton({addTag, tagSuggestion}: TagSuggestionButtonProps) {
	return (
		<Button
			variant="warning"
			type="button"
			onClick={() => addTag(tagSuggestion)}
		>
			<FontAwesomeIcon icon={faTag} /> {tagSuggestion}
		</Button>
	);
}

export default TagSuggestionButton;
