import React, {useState} from 'react';

import Button                  from 'react-bootstrap/Button';
import SearchBlueprintTypeForm from './SearchBlueprintTypeForm';
import SearchEntityForm        from './SearchEntityForm';
import SearchModForm           from './SearchModForm';
import SearchRecipeForm        from './SearchRecipeForm';
import SearchSortOrderForm     from './SearchSortOrderForm';
import SearchTagForm           from './SearchTagForm';
import SearchTextForm          from './SearchTextForm';
import SearchVersionForm       from './SearchVersionForm';

const SearchQuery = ({setSearchState}) =>
{
	const [textState,          setTextState]          = useState('');
	const [sortOrderState,     setSortOrderState]     = useState('Favorites');
	const [tagState,           setTagState]           = useState('');
	const [entityState,        setEntityState]        = useState('');
	const [recipeState,        setRecipeState]        = useState('');
	const [versionState,       setVersionState]       = useState('');
	const [blueprintTypeState, setBlueprintTypeState] = useState('');
	const [modState,           setModState]           = useState('');

	const getSearchState = () => ({
		textState,
		sortOrderState,
		tagState,
		entityState,
		recipeState,
		versionState,
		blueprintTypeState,
		modState,
	});

	const handleSubmit = e =>
	{
		e.preventDefault();
		setSearchState(getSearchState());
	}

	const handleClear = e =>
	{
		e.preventDefault();
		setTextState('');
		setSortOrderState('Favorites');
		setTagState('');
		setEntityState('');
		setRecipeState('');
		setVersionState('');
		setBlueprintTypeState('');
		setModState('');
		setSearchState(getSearchState());
	}

	return <>
		<SearchTextForm textState={textState} setTextState={setTextState} />

		<SearchSortOrderForm     sortOrderState={sortOrderState}         setSortOrderState={setSortOrderState}         />
		<SearchModForm           modState={modState}                     setModState={setModState}                     />
		<SearchTagForm           tagState={tagState}                     setTagState={setTagState}                     />
		<SearchEntityForm        entityState={entityState}               setEntityState={setEntityState}               />
		<SearchRecipeForm        recipeState={recipeState}               setRecipeState={setRecipeState}               />
		<SearchVersionForm       versionState={versionState}             setVersionState={setVersionState}             />
		<SearchBlueprintTypeForm blueprintTypeState={blueprintTypeState} setBlueprintTypeState={setBlueprintTypeState} />

		<Button onClick={handleSubmit} variant="warning">
			Search
		</Button>

		<Button onClick={handleClear}>
			Clear
		</Button>
	</>;
};

SearchQuery.propTypes    = {};
SearchQuery.defaultProps = {};

export default SearchQuery;
