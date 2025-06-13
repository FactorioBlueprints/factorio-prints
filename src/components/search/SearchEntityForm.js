import React  from 'react';
import Form   from 'react-bootstrap/Form';
import Select from 'react-select';

import useEntityOptions from '../../hooks/useEntityOptions';
import ReactQueryStatus from './ReactQueryStatus';

const SearchEntityForm = ({entityState, setEntityState}) =>
{
	const handleEntity = selected =>
	{
		if (selected === null || selected === undefined)
		{
			setEntityState(null);
			return;
		}
		setEntityState(selected.value);
	};

	const result                       = useEntityOptions();
	const {data, isSuccess, isPending} = result;

	const options = isSuccess
		? data.data.map((value) => ({value: value, label: value}))
		: [];

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Entities <ReactQueryStatus {...result} />
			</Form.Label>

			<Select
				options={options}
				isLoading={isPending}
				isClearable={true}
				placeholder={'Any entity'}
				value={entityState === null ? null : {value: entityState, label: entityState}}
				onChange={handleEntity}
			/>
		</Form.Group>
	);
};

SearchEntityForm.propTypes    = {};
SearchEntityForm.defaultProps = {};

export default SearchEntityForm;
