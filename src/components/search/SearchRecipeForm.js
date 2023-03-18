import React            from 'react';
import Form             from 'react-bootstrap/Form';
import useRecipeOptions from '../../hooks/useRecipeOptions';
import ReactQueryStatus from './ReactQueryStatus';

const SearchRecipeForm = ({recipeState, setRecipeState}) =>
{
	const handleRecipe = e =>
	{
		e.preventDefault();
		setRecipeState(e.target.value);
	};

	const result            = useRecipeOptions();
	const {data, isSuccess} = result;

	return (
		<Form.Group className='mb-3'>
			<Form.Label>
				Recipes <ReactQueryStatus {...result} />
			</Form.Label>
			<Form.Select size='sm' aria-label='Select recipe' onChange={handleRecipe} value={recipeState}>
				<option value={''}>Any recipe</option>
				{
					isSuccess && data.data.map(
						(recipeOptionString, index) =>
							<option key={index} value={recipeOptionString}>
								{recipeOptionString}
							</option>,
					)
				}
			</Form.Select>
		</Form.Group>
	);
};

SearchRecipeForm.propTypes    = {};
SearchRecipeForm.defaultProps = {};

export default SearchRecipeForm;
