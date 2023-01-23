import React        from 'react';
import Col          from 'react-bootstrap/Col';
import Select       from 'react-select';
import makeAnimated from 'react-select/animated';

import {ArrayParam, useQueryParam, withDefault} from 'use-query-params';

import useTagOptions from '../../hooks/useTagOptions';

const animatedComponents = makeAnimated();

EfficientTagForm.propTypes = {};

function EfficientTagForm()
{
	const {tagValuesSet, tagOptions} = useTagOptions();

	const [selectedTags, setTags] = useQueryParam('tags', withDefault(ArrayParam, []));

	const selectedTagOptions = selectedTags
		.filter(each => tagValuesSet.has(each))
		.map(value => ({label: value, value}));

	const setSelectedTagValues = (selectedTags) =>
	{
		const selectedTagValues = selectedTags.map(selectedTag => selectedTag.value);
		setTags(selectedTagValues);
	};

	return (
		<Col md={6}>
			<Select
				value={selectedTagOptions}
				options={tagOptions}
				onChange={setSelectedTagValues}
				isMulti
				closeMenuOnSelect
				components={animatedComponents}
				placeholder='search tags'
				className='tag-form'
			/>
		</Col>
	);
}

export default EfficientTagForm;
