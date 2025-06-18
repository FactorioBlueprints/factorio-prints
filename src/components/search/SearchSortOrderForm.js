import React from 'react';
import Form from 'react-bootstrap/Form';

const SearchSortOrderForm = ({sortOrderState, setSortOrderState}) => {
	const handleSortOrder = (e) => {
		e.preventDefault();
		setSortOrderState(e.target.value);
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Sort Order</Form.Label>
			<Form.Select
				size="sm"
				aria-label="Select Sort Order"
				onChange={handleSortOrder}
				value={sortOrderState}
			>
				<option value={'Favorites'}>Favorites</option>
				<option value={'Updated'}>Updated</option>
			</Form.Select>
		</Form.Group>
	);
};

SearchSortOrderForm.propTypes = {};
SearchSortOrderForm.defaultProps = {};

export default SearchSortOrderForm;
