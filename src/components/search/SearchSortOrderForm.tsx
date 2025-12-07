import Form from 'react-bootstrap/Form';

interface SearchSortOrderFormProps {
	sortOrderState: string;
	setSortOrderState: (value: string) => void;
}

function SearchSortOrderForm({sortOrderState, setSortOrderState}: SearchSortOrderFormProps)
{
	const handleSortOrder = (e: React.ChangeEvent<HTMLSelectElement>) =>
	{
		e.preventDefault();
		setSortOrderState(e.target.value);
	};

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Sort Order
			</Form.Label>
			<Form.Select size="sm" aria-label='Select Sort Order' onChange={handleSortOrder} value={sortOrderState}>
				<option value={'Favorites'}>Favorites</option>
				<option value={'Updated'}>Updated</option>
			</Form.Select>
		</Form.Group>
	);
}

export default SearchSortOrderForm;
