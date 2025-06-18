import Col from 'react-bootstrap/Col';
import type {GroupBase, SelectComponentsConfig} from 'react-select';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';

import {ArrayParam, useQueryParam, withDefault} from 'use-query-params';

import useTagOptions, {type TagOption} from '../../hooks/useTagOptions';

const animatedComponents = makeAnimated() as SelectComponentsConfig<TagOption, true, GroupBase<TagOption>>;

function EfficientTagForm() {
	const {tagValuesSet, tagOptions} = useTagOptions();

	const [selectedTags, setTags] = useQueryParam('tags', withDefault(ArrayParam, []));

	const selectedTagOptions = (selectedTags as string[])
		.filter((each) => tagValuesSet.has(each))
		.map((value) => ({label: value, value}));

	const setSelectedTagValues = (selectedTags: readonly TagOption[]) => {
		const selectedTagValues = selectedTags.map((selectedTag) => selectedTag.value);
		setTags(selectedTagValues);
	};

	return (
		<Col md={6}>
			<Select<TagOption, true>
				value={selectedTagOptions}
				options={tagOptions}
				onChange={setSelectedTagValues}
				isMulti
				closeMenuOnSelect
				components={animatedComponents}
				placeholder="search tags"
				className="tag-form"
			/>
		</Col>
	);
}

export default EfficientTagForm;
