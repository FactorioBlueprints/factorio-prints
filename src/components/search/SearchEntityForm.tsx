import Form from 'react-bootstrap/Form';
import Select from 'react-select';

import useEntityOptions from '../../hooks/useEntityOptions';
import ReactQueryStatus from './ReactQueryStatus';

interface SearchEntityFormProps {
	entityState: string | null;
	setEntityState: (value: string | null) => void;
}

function SearchEntityForm({entityState, setEntityState}: SearchEntityFormProps) {
	const handleEntity = (selected: {value: string; label: string} | null) => {
		if (selected === null || selected === undefined) {
			setEntityState(null);
			return;
		}
		setEntityState(selected.value);
	};

	const result = useEntityOptions();
	const {data, isSuccess, isPending} = result;

	const options = isSuccess ? (data.data as string[]).map((value) => ({value: value, label: value})) : [];

	return (
		<Form.Group className="mb-3">
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
}

export default SearchEntityForm;
