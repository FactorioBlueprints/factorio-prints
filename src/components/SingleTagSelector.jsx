import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import Col from 'react-bootstrap/Col';
import Select from 'react-select';
import { useNavigate } from '@tanstack/react-router';

import { useTags } from '../hooks/useTags';

const SingleTagSelector = ({ currentTag }) =>
{
	const { data: tagsData, isLoading: tagsLoading } = useTags();
	const navigate = useNavigate();

	const normalizedCurrentTag = currentTag?.replace(/^\/|\/$/g, '') || '';

	const selectedOption = normalizedCurrentTag
		? { value: normalizedCurrentTag, label: normalizedCurrentTag.replace(/\//g, ' › ') }
		: null;

	// Format tag options for react-select
	const options = useMemo(() =>
	{
		const tags = tagsData?.tags || [];
		return tags.map(value => ({
			value,
			label: value.replace(/\//g, ' › '),
		}));
	}, [tagsData]);

	const handleTagSelection = (selected) =>
	{
		if (!selected) return;

		const normalizedTag = selected.value.replace(/^\/|\/$/g, '');

		if (normalizedTag !== normalizedCurrentTag)
		{
			const parts = normalizedTag.split('/');

			if (parts.length === 2)
			{
				const [category, name] = parts;
				navigate({ to: '/tagged/$category/$name', params: { category, name } });
			}
			else
			{
				console.error(`Invalid tag format: "${normalizedTag}" should have exactly one slash`);
			}
		}
	};

	return (
		<Col md={6}>
			<Select
				value={selectedOption}
				options={options}
				onChange={handleTagSelection}
				isMulti={false}
				placeholder='Select or search for a tag'
				className='tag-selector'
				isLoading={tagsLoading}
				isClearable={false}
				isSearchable={true}
				closeMenuOnSelect={true}
			/>
		</Col>
	);
};

SingleTagSelector.propTypes = {
	currentTag: PropTypes.string,
};

export default SingleTagSelector;
