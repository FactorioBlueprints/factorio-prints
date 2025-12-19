import {useStore} from '@tanstack/react-store';
import type React from 'react';
import Form from 'react-bootstrap/Form';

import type {SortOrder} from '../../api/rest/types';
import {advancedSearchStore, setOrderBy} from '../../store/advancedSearchStore';

const SortOrderSelect: React.FC = () => {
	const orderBy = useStore(advancedSearchStore, (state) => state.orderBy);

	const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
		setOrderBy(event.target.value as SortOrder);
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Sort By</Form.Label>
			<Form.Select
				value={orderBy}
				onChange={handleChange}
			>
				<option value="Favorites">Most Favorited</option>
				<option value="Updated">Most Recent</option>
			</Form.Select>
		</Form.Group>
	);
};

export default SortOrderSelect;
