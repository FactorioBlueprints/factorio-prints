import type React from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';

import {resetAdvancedSearch, submitSearch} from '../../store/advancedSearchStore';
import BlueprintTypeSelect from './BlueprintTypeSelect';
import EntityFilterSelect from './EntityFilterSelect';
import ModFilterSelect from './ModFilterSelect';
import RecipeFilterSelect from './RecipeFilterSelect';
import SearchTextInput from './SearchTextInput';
import SortOrderSelect from './SortOrderSelect';
import TagFilterSelect from './TagFilterSelect';
import VersionFilterSelect from './VersionFilterSelect';

const SearchQueryPanel: React.FC = () => {
	const handleSearch = (): void => {
		submitSearch();
	};

	const handleClear = (): void => {
		resetAdvancedSearch();
	};

	return (
		<Container>
			<SearchTextInput />
			<SortOrderSelect />
			<ModFilterSelect />
			<TagFilterSelect />
			<EntityFilterSelect />
			<RecipeFilterSelect />
			<VersionFilterSelect />
			<BlueprintTypeSelect />

			<Button
				variant="warning"
				onClick={handleSearch}
			>
				Search
			</Button>

			<Button onClick={handleClear}>Clear</Button>
		</Container>
	);
};

export default SearchQueryPanel;
