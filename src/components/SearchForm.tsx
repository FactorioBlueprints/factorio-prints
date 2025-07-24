import {faSearch} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useStore} from '@tanstack/react-store';
import type React from 'react';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

import {searchParamsStore} from '../store/searchParamsStore';

const SearchForm: React.FC = () => {
	const titleFilter = useStore(searchParamsStore, (state) => state.titleFilter);

	const filterOnTitle = (title: string): void => {
		if (title === undefined) {
			console.error('Title is undefined in filterOnTitle');
			throw new Error('Title is undefined in filterOnTitle');
		}

		searchParamsStore.setState((state) => ({
			...state,
			titleFilter: title,
		}));

		console.log('SearchForm updated titleFilter:', title);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
		if (event.key === 'Escape') {
			event.currentTarget.select();
		}
	};

	const handleSearchString = (event: React.ChangeEvent<HTMLInputElement>): void => {
		event.preventDefault();

		const searchString = event.target.value;
		filterOnTitle(searchString);
	};

	return (
		<Col md={6}>
			<InputGroup
				size="sm"
				className="search-form"
			>
				<Form.Control
					type="text"
					placeholder="search titles"
					value={titleFilter}
					onChange={handleSearchString}
					onKeyDown={handleKeyDown}
				/>
				<InputGroup.Text className="py-0 px-2">
					<FontAwesomeIcon
						icon={faSearch}
						size="sm"
					/>
				</InputGroup.Text>
			</InputGroup>
		</Col>
	);
};

export default SearchForm;
