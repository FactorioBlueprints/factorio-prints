import {useStore} from '@tanstack/react-store';
import type React from 'react';
import {useMemo} from 'react';
import Form from 'react-bootstrap/Form';
import Select, {type SingleValue} from 'react-select';

import {useRestTags} from '../../hooks/useRestTags';
import {advancedSearchStore, setTag} from '../../store/advancedSearchStore';

interface TagOption {
	value: string;
	label: string;
}

const TagFilterSelect: React.FC = () => {
	const {tagStrings, isLoading} = useRestTags();
	const tag = useStore(advancedSearchStore, (state) => state.tag);

	const options = useMemo(() => {
		return tagStrings.map((value) => ({
			value,
			label: value,
		}));
	}, [tagStrings]);

	const selectedOption = tag ? {value: tag, label: tag} : null;

	const handleChange = (selected: SingleValue<TagOption>): void => {
		setTag(selected?.value ?? null);
	};

	return (
		<Form.Group className="mb-3">
			<Form.Label>Tags</Form.Label>
			<Select<TagOption>
				value={selectedOption}
				options={options}
				onChange={handleChange}
				isLoading={isLoading}
				isClearable={true}
				isSearchable={true}
				placeholder="Any tag"
			/>
		</Form.Group>
	);
};

export default TagFilterSelect;
