import React from 'react';
import Form  from 'react-bootstrap/Form';

const SearchModForm = ({modState, setModState}) =>
{
	const handleMod = e =>
	{
		e.preventDefault();
		setModState(e.target.value);
	};

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Mod
			</Form.Label>
			<Form.Select size='sm' aria-label='Select mod' onChange={handleMod} value={modState}>
				<option value={''}>Any mod</option>
				<option value={'base'}>Base game only</option>
				<option value={'base&creative'}>Only base and creative</option>
				<option value={'unknown'}>Includes unknown mod</option>
				<option value={'aai'}>AAI (Advanced Autonomous Industries)</option>
				<option value={'ltn'}>LTN (Logistic Train Network)</option>
				<option value={'krastorio'}>Krastorio</option>
				<option value={'space-exploration'}>Space Exploration</option>
				<option value={'bobs'}>Bob's Mods</option>
				<option value={'creative'}>Creative Mod</option>
			</Form.Select>
		</Form.Group>
	);
};

SearchModForm.propTypes    = {};
SearchModForm.defaultProps = {};

export default SearchModForm;
