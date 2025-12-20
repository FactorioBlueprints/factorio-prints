import {useStore} from '@tanstack/react-store';
import type React from 'react';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import {advancedSearchStore, setSearchText} from '../../store/advancedSearchStore';

const SearchTextInput: React.FC = () => {
	const text = useStore(advancedSearchStore, (state) => state.text);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
		setSearchText(event.target.value);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'Escape') {
			event.currentTarget.select();
		}
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Text</Form.Label>
			<InputGroup>
				<Form.Control
					size="sm"
					type="text"
					placeholder="Text..."
					value={text}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
				/>
			</InputGroup>
		</Form.Group>
	);
};

export default SearchTextInput;
