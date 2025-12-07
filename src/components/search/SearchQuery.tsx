import {useState} from 'react';

import Button from 'react-bootstrap/Button';
import SearchBlueprintTypeForm from './SearchBlueprintTypeForm';
import SearchEntityForm from './SearchEntityForm';
import SearchModForm from './SearchModForm';
import SearchRecipeForm from './SearchRecipeForm';
import SearchSortOrderForm from './SearchSortOrderForm';
import SearchTagForm from './SearchTagForm';
import SearchTextForm from './SearchTextForm';
import SearchVersionForm from './SearchVersionForm';

export interface SearchState {
	textState: string;
	sortOrderState: string;
	tagState: string | null;
	entityState: string | null;
	recipeState: string | null;
	versionState: number | null;
	blueprintTypeState: string;
	modState: string;
}

interface SearchQueryProps {
	setSearchState: (state: SearchState | undefined) => void;
}

function SearchQuery({setSearchState}: SearchQueryProps) {
	const [textState, setTextState] = useState('');
	const [sortOrderState, setSortOrderState] = useState('Favorites');
	const [tagState, setTagState] = useState<string | null>(null);
	const [entityState, setEntityState] = useState<string | null>(null);
	const [recipeState, setRecipeState] = useState<string | null>(null);
	const [versionState, setVersionState] = useState<number | null>(null);
	const [blueprintTypeState, setBlueprintTypeState] = useState('');
	const [modState, setModState] = useState('');

	const getSearchState = (): SearchState => ({
		textState,
		sortOrderState,
		tagState,
		entityState,
		recipeState,
		versionState,
		blueprintTypeState,
		modState,
	});

	const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setSearchState(getSearchState());
	};

	const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setTextState('');
		setSortOrderState('Favorites');
		setTagState(null);
		setEntityState(null);
		setRecipeState(null);
		setVersionState(null);
		setBlueprintTypeState('');
		setModState('');
		setSearchState(undefined);
	};

	return (
		<>
			<SearchTextForm
				textState={textState}
				setTextState={setTextState}
			/>

			<SearchSortOrderForm
				sortOrderState={sortOrderState}
				setSortOrderState={setSortOrderState}
			/>
			<SearchModForm
				modState={modState}
				setModState={setModState}
			/>
			<SearchTagForm
				tagState={tagState}
				setTagState={setTagState}
			/>
			<SearchEntityForm
				entityState={entityState}
				setEntityState={setEntityState}
			/>
			<SearchRecipeForm
				recipeState={recipeState}
				setRecipeState={setRecipeState}
			/>
			<SearchVersionForm
				versionState={versionState}
				setVersionState={setVersionState}
			/>
			<SearchBlueprintTypeForm
				blueprintTypeState={blueprintTypeState}
				setBlueprintTypeState={setBlueprintTypeState}
			/>

			<Button
				onClick={handleSubmit}
				variant="warning"
			>
				Search
			</Button>

			<Button onClick={handleClear}>Clear</Button>
		</>
	);
}

export default SearchQuery;
