import {faTag} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type React from 'react';
import Button from 'react-bootstrap/Button';

interface TagSuggestionButtonProps {
	tagSuggestion: string;
	addTag: (tag: string) => void;
}

const TagSuggestionButton: React.FC<TagSuggestionButtonProps> = ({tagSuggestion, addTag}) => {
	const handleClick = (): void => {
		addTag(tagSuggestion);
	};

	return (
		<Button
			variant="warning"
			type="button"
			onClick={handleClick}
		>
			<FontAwesomeIcon icon={faTag} /> {tagSuggestion}
		</Button>
	);
};

export default TagSuggestionButton;
