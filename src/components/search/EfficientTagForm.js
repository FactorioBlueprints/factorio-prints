import React, {useContext} from 'react';
import Col                 from 'react-bootstrap/Col';
import Select              from 'react-select';
import makeAnimated        from 'react-select/animated';

import SearchContext from '../../context/searchContext';
import useTagOptions from '../../hooks/useTagOptions';

const animatedComponents = makeAnimated();

EfficientTagForm.propTypes = {};

function EfficientTagForm(props)
{
	const {tagValuesSet, tagOptions} = useTagOptions();

	const {selectedTags, setSelectedTags} = useContext(SearchContext);

	const selectedTagOptions = selectedTags
		.filter(each => tagValuesSet.has(each))
		.map(value => ({label: value, value}));

	const setSelectedTagValues = (selectedTags) =>
	{
		const selectedTagValues = selectedTags.map(selectedTag => selectedTag.value);
		setSelectedTags(selectedTagValues);
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
