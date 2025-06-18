import React from 'react';
import Form from 'react-bootstrap/Form';
import Select from 'react-select';

import useRecipeOptions from '../../hooks/useRecipeOptions';
import ReactQueryStatus from './ReactQueryStatus';

const SearchRecipeForm = ({recipeState, setRecipeState}) => {
	const handleRecipe = (selected) => {
		if (selected === null || selected === undefined) {
			setRecipeState(null);
			return;
		}
		setRecipeState(selected.value);
	};

	const result = useRecipeOptions();
	const {data, isSuccess, isPending} = result;

	const options = isSuccess ? data.data.map((value) => ({value: value, label: value})) : [];

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
};

SearchRecipeForm.propTypes = {};
SearchRecipeForm.defaultProps = {};

export default SearchRecipeForm;
