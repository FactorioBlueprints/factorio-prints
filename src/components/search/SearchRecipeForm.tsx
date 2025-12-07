import Form from 'react-bootstrap/Form';
import Select from 'react-select';

import useRecipeOptions from '../../hooks/useRecipeOptions';
import ReactQueryStatus from './ReactQueryStatus';

interface SearchRecipeFormProps {
	recipeState: string | null;
	setRecipeState: (value: string | null) => void;
}

function SearchRecipeForm({recipeState, setRecipeState}: SearchRecipeFormProps) {
	const handleRecipe = (selected: {value: string; label: string} | null) => {
		if (selected === null || selected === undefined) {
			setRecipeState(null);
			return;
		}
		setRecipeState(selected.value);
	};

	const result = useRecipeOptions();
	const {data, isSuccess, isPending} = result;

	const options = isSuccess ? (data.data as string[]).map((value) => ({value: value, label: value})) : [];

	return (
		<Form.Group className="mb-3">
			<Form.Label>
				Recipes <ReactQueryStatus {...result} />
			</Form.Label>

			<Select
				options={options}
				isLoading={isPending}
				isClearable={true}
				placeholder={'Any recipe'}
				value={recipeState === null ? null : {value: recipeState, label: recipeState}}
				onChange={handleRecipe}
			/>
		</Form.Group>
	);
}

export default SearchRecipeForm;
