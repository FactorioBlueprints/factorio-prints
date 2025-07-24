import {useStore} from '@tanstack/react-store';
import type React from 'react';
import {useMemo} from 'react';
import Col from 'react-bootstrap/Col';
import Select, {type MultiValue} from 'react-select';

import {useTags} from '../hooks/useTags';
import {searchParamsStore} from '../store/searchParamsStore';

interface TagOption {
	value: string;
	label: string;
}

const TagForm: React.FC = () => {
	const {data: tagsData, isLoading: tagsLoading} = useTags();

	const filteredTags = useStore(searchParamsStore, (state) => state.filteredTags);
	const selectedOptions = filteredTags.map((value) => ({value, label: value}));

	const handleTagSelection = (selectedTags: MultiValue<TagOption>) => {
		if (selectedTags === undefined) {
			console.error('selectedTags is undefined in handleTagSelection');
			throw new Error('selectedTags is undefined in handleTagSelection');
		}

		const tagValues = selectedTags ? [...selectedTags].map((tag) => tag.value) : [];
		searchParamsStore.setState((state) => ({...state, filteredTags: tagValues}));

		console.log('TagForm updated filteredTags:', tagValues);
	};

	const options = useMemo(() => {
		const tags = tagsData?.tags || [];
		return tags.map((value) => ({
			value,
			label: value,
		}));
	}, [tagsData]);

	return (
		<Col md={6}>
			<Select<TagOption, true>
				value={selectedOptions}
				options={options}
				onChange={handleTagSelection}
				isMulti
				placeholder="search tags"
				className="tag-form"
				isLoading={tagsLoading}
				isClearable={true}
				isSearchable={true}
				closeMenuOnSelect={false}
			/>
		</Col>
	);
};

export default TagForm;
