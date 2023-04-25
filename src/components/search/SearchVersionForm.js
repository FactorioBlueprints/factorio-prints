import React  from 'react';
import Form   from 'react-bootstrap/Form';
import Select from 'react-select';

import gameVersions from './gameVersions.json';

const options = gameVersions.map((versionObject) => ({value: versionObject.versionNumber, label: `${versionObject.version1}.${versionObject.version2}.${versionObject.version3}`}))

const optionsByValue = options.reduce((acc, option) =>
{
	acc[option.value] = option;
	return acc;
}, {});

const SearchVersionForm = ({versionState, setVersionState}) =>
{
	const handleVersion = selected =>
	{
		if (selected === null || selected === undefined)
		{
			setVersionState(null);
			return;
		}
		setVersionState(selected.value);
	};

	const selectedValue = optionsByValue[versionState];

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Versions
			</Form.Label>

			<Select
				options={options}
				isClearable={true}
				placeholder={'Any version'}
				value={selectedValue}
				onChange={handleVersion}
			/>
		</Form.Group>
	);
};

SearchVersionForm.propTypes    = {};
SearchVersionForm.defaultProps = {};

export default SearchVersionForm;
