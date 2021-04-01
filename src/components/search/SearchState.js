import PropTypes         from 'prop-types';
import React, {useState} from 'react';
import SearchContext     from '../../context/searchContext';
import useQueryString    from '../../hooks/useQueryString';

SearchState.propTypes = {
	children: PropTypes.node.isRequired,
};

function SearchState(props)
{
	const [titleFilter, setTitleFilter] = useQueryString('title', '');
	const [selectedTags, setSelectedTags] = useQueryString('tag', []);

	return (
		<SearchContext.Provider value={{titleFilter, setTitleFilter, selectedTags, setSelectedTags}}>
			{props.children}
		</SearchContext.Provider>
	);
}

export default SearchState;
