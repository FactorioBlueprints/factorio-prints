const initialState = 1;

const createCurrentPage = (name) =>
{
	const currentPageReducer = (state = initialState, action) =>
	{
		switch (action.type)
		{
			case `SAVE_NEXT_${name}`:
				return state + 1;
			case `SAVE_PREVIOUS_${name}`:
				return state - 1;
			case `SAVE_FIRST_${name}`:
				return initialState;
			default:
				return state;
		}
	};
	return currentPageReducer;
};

export default createCurrentPage;
