import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
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
			<Form.Label>Text Search</Form.Label>
			<InputGroup>
				<Form.Control
					type="text"
					placeholder="Search blueprints..."
					value={text}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
				/>
				<InputGroup.Text>
					<FontAwesomeIcon icon={faSearch} />
				</InputGroup.Text>
			</InputGroup>
		</Form.Group>
	);
};

export default SearchTextInput;
