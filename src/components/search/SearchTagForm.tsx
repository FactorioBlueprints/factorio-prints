import Form from 'react-bootstrap/Form';
import Select from 'react-select';

import useSimpleTagOptions from '../../hooks/useSimpleTagOptions';
import ReactQueryStatus from './ReactQueryStatus';

interface SearchTagFormProps {
	tagState: string | null;
	setTagState: (value: string | null) => void;
}

function SearchTagForm({tagState, setTagState}: SearchTagFormProps) {
	const handleTag = (selected: {value: string; label: string} | null) => {
		if (selected === null) {
			setTagState(null);
			return;
		}
		setTagState(selected.value);
	};

	const result = useSimpleTagOptions();
	const {data, isSuccess, isPending} = result;

	const options = isSuccess ? data.map((value: string) => ({value: value, label: value})) : [];

	return (
		<Form.Group className="mb-3">
			<Form.Label>
				{'Tags '}
				<ReactQueryStatus {...result} />
			</Form.Label>

			<Select
				options={options}
				isLoading={isPending}
				isClearable={true}
				placeholder={'Any tag'}
				value={tagState === null ? null : {value: tagState, label: tagState}}
				onChange={handleTag}
			/>
		</Form.Group>
	);
}

export default SearchTagForm;
