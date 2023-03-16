import React from 'react';
import Form  from 'react-bootstrap/Form';

const SearchBlueprintTypeForm = ({blueprintTypeState, setBlueprintTypeState}) =>
{
	const handleBlueprintType = e =>
	{
		e.preventDefault();
		setBlueprintTypeState(e.target.value);
	};

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Blueprint type
			</Form.Label>
			<Form.Select size="sm" aria-label='Select blueprint type' onChange={handleBlueprintType} value={blueprintTypeState}>
				<option value={''}>Any blueprint Type</option>
				<option value={'blueprint'}>Blueprint</option>
				<option value={'blueprint-book'}>Blueprint Book</option>
				<option value={'upgrade-planner'}>Upgrade Planner</option>
				<option value={'deconstruction-planner'}>Deconstruction Planner</option>
			</Form.Select>
		</Form.Group>
	);
};

SearchBlueprintTypeForm.propTypes    = {};
SearchBlueprintTypeForm.defaultProps = {};

export default SearchBlueprintTypeForm;
