import PropTypes         from 'prop-types';
import React, {useState} from 'react';
import SearchContext     from '../../context/searchContext';

SearchState.propTypes = {
	children: PropTypes.node.isRequired,
};

function SearchState(props)
{
	const [titleFilter, setTitleFilter]   = useState('');
	const [selectedTags, setSelectedTags] = useState([]);

	return (
		<SearchContext.Provider value={{titleFilter, setTitleFilter, selectedTags, setSelectedTags}}>
			{props.children}
		</SearchContext.Provider>
	);
}

export default SearchState;
