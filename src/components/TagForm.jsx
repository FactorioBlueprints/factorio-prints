import {useStore}       from '@tanstack/react-store';
import React, {useMemo} from 'react';
import Col              from 'react-bootstrap/Col';
import Select           from 'react-select';

import {useTags}           from '../hooks/useTags';
import {searchParamsStore} from '../store/searchParamsStore';

const TagForm = () =>
{
	const { data: tagsData, isLoading: tagsLoading } = useTags();

	const filteredTags = useStore(searchParamsStore, state => state.filteredTags);
	const selectedOptions = filteredTags.map(value => ({ value, label: value }));

	const handleTagSelection = (selectedTags) =>
	{
		if (selectedTags === undefined)
		{
			console.error('selectedTags is undefined in handleTagSelection');
			throw new Error('selectedTags is undefined in handleTagSelection');
		}

		const tagValues = selectedTags.map(tag => tag.value);
		searchParamsStore.setState(state => ({ ...state, filteredTags: tagValues }));

		console.log('TagForm updated filteredTags:', tagValues);
	};

	const options = useMemo(() =>
	{
		const tags = tagsData?.tags || [];
		return tags.map(value => ({
			value,
			label: value,
		}));
	}, [tagsData]);

	return (
		<Col md={6}>
			<Select
				value={selectedOptions}
				options={options}
				onChange={handleTagSelection}
				isMulti
				placeholder='search tags'
				className='tag-form'
				isLoading={tagsLoading}
				isClearable={true}
				isSearchable={true}
				closeMenuOnSelect={false}
			/>
		</Col>
	);
};

TagForm.propTypes = {};

export default TagForm;
