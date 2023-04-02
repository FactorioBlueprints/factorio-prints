import React  from 'react';
import Form   from 'react-bootstrap/Form';
import Select from 'react-select';

import useSimpleTagOptions from '../../hooks/useSimpleTagOptions';
import ReactQueryStatus    from './ReactQueryStatus';

const SearchTagForm = ({tagState, setTagState}) =>
{
	const handleTag = selected =>
	{
		if (selected === null)
		{
			setTagState(null);
			return;
		}
		setTagState(selected.value);
	};

	const result                       = useSimpleTagOptions();
	const {data, isSuccess, isLoading} = result;

	const options = isSuccess
		? data.map((value) => ({value: value, label: value}))
		: [];

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				{'Tags '}<ReactQueryStatus {...result} />
			</Form.Label>

			<Select
				options={options}
				isLoading={isLoading}
				isClearable={true}
				placeholder={'Any tag'}
				value={tagState === null ? null : {value: tagState, label: tagState}}
				onChange={handleTag}
			/>
		</Form.Group>
	);
};

SearchTagForm.propTypes    = {};
SearchTagForm.defaultProps = {};

export default SearchTagForm;
