import {useStore} from '@tanstack/react-store';
import type React from 'react';
import {useMemo} from 'react';
import Form from 'react-bootstrap/Form';
import Select, {type SingleValue} from 'react-select';

import {useRecipeOptions} from '../../hooks/useRecipeOptions';
import {advancedSearchStore, setRecipe} from '../../store/advancedSearchStore';

interface RecipeOption {
	value: string;
	label: string;
}

const RecipeFilterSelect: React.FC = () => {
	const {data: recipes, isLoading} = useRecipeOptions();
	const recipe = useStore(advancedSearchStore, (state) => state.recipe);

	const options = useMemo(() => {
		return (recipes ?? []).map((value) => ({
			value,
			label: value,
		}));
	}, [recipes]);

	const selectedOption = recipe ? {value: recipe, label: recipe} : null;

	const handleChange = (selected: SingleValue<RecipeOption>): void => {
		setRecipe(selected?.value ?? null);
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Recipe</Form.Label>
			<Select<RecipeOption>
				value={selectedOption}
				options={options}
				onChange={handleChange}
				isLoading={isLoading}
				isClearable={true}
				isSearchable={true}
				placeholder="Select recipe..."
			/>
		</Form.Group>
	);
};

export default RecipeFilterSelect;
