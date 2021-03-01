import PropTypes         from 'prop-types';
import React, {useState} from 'react';
import SearchContext     from '../../context/searchContext';

SearchState.propTypes = {
	children: PropTypes.node.isRequired,
};

function SearchState(props)
{
	const [titleFilter, setTitleFilter] = useState('');

	return (
		<SearchContext.Provider value={{titleFilter, setTitleFilter}}>
			{props.children}
		</SearchContext.Provider>
	);
}

export default SearchState;
