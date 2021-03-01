import React from 'react';

const SearchContext = React.createContext({
	titleFilter    : '',
	setTitleFilter : undefined,
	selectedTags   : [],
	setSelectedTags: undefined,
});

export default SearchContext;
