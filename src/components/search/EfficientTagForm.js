import axios               from 'axios';
import React, {useContext} from 'react';
import Col                 from 'react-bootstrap/Col';
import {useQuery}          from 'react-query';
import Select              from 'react-select';
import makeAnimated        from 'react-select/animated';

import SearchContext from '../../context/searchContext';

const animatedComponents = makeAnimated();

EfficientTagForm.propTypes = {};

function EfficientTagForm(props)
{
	const {selectedTags, setSelectedTags} = useContext(SearchContext);

	const options = {
		placeholderData: [],
	};

	const fetchTagsOptions = async () =>
	{
		const tags = await axios.get(`${process.env.REACT_APP_REST_URL}/api/tags/`);
		return tags.data.map(tag => ({label: `${tag.category}/${tag.name}`, value: `/${tag.category}/${tag.name}/`}));
	};

	const result     = useQuery(['tags'], fetchTagsOptions, options);
	const tagOptions = result.data;

	console.log({tagOptions, selectedTags});

	return (
		<Col md={6}>
			<Select
				value={selectedTags}
				options={tagOptions}
				onChange={setSelectedTags}
				isMulti
				closeMenuOnSelect={false}
				components={animatedComponents}
				placeholder='search tags'
				className='tag-form'
			/>
		</Col>
	);
}

export default EfficientTagForm;
