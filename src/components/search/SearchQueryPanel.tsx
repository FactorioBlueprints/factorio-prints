import {faEraser, faSearch} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type React from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Stack from 'react-bootstrap/Stack';

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
		<Card>
			<Card.Header>
				<FontAwesomeIcon icon={faSearch} /> Advanced Search
			</Card.Header>
			<Card.Body>
				<SearchTextInput />
				<SortOrderSelect />
				<BlueprintTypeSelect />
				<ModFilterSelect />
				<TagFilterSelect />
				<EntityFilterSelect />
				<RecipeFilterSelect />
				<VersionFilterSelect />

				<Stack
					direction="horizontal"
					gap={2}
					className="mt-3"
				>
					<Button
						variant="primary"
						onClick={handleSearch}
					>
						<FontAwesomeIcon icon={faSearch} /> Search
					</Button>
					<Button
						variant="outline-secondary"
						onClick={handleClear}
					>
						<FontAwesomeIcon icon={faEraser} /> Clear
					</Button>
				</Stack>
			</Card.Body>
		</Card>
	);
};

export default SearchQueryPanel;
