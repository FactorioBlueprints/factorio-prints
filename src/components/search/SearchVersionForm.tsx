import Form   from 'react-bootstrap/Form';
import Select from 'react-select';

import gameVersions from './gameVersions.json';

interface GameVersion {
	versionNumber: number;
	version1: number;
	version2: number;
	version3: number;
}

interface VersionOption {
	value: number;
	label: string;
}

const options: VersionOption[] = (gameVersions as GameVersion[]).map((versionObject) => ({value: versionObject.versionNumber, label: `${versionObject.version1}.${versionObject.version2}.${versionObject.version3}`}))

const optionsByValue: Record<number, VersionOption> = options.reduce((acc, option) =>
{
	acc[option.value] = option;
	return acc;
}, {} as Record<number, VersionOption>);

interface SearchVersionFormProps {
	versionState: number | null;
	setVersionState: (value: number | null) => void;
}

function SearchVersionForm({versionState, setVersionState}: SearchVersionFormProps)
{
	const handleVersion = (selected: VersionOption | null) =>
	{
		if (selected === null || selected === undefined)
		{
			setVersionState(null);
			return;
		}
		setVersionState(selected.value);
	};

	const selectedValue = versionState !== null && versionState in optionsByValue ? optionsByValue[versionState] : null;

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
}

export default SearchVersionForm;
