const initialState = {
	loading: false,
	data   : [],
	error  : undefined,
};

const arrayReducer = (fetchingActionType, receivedActionType, failedActionType) =>
	(state = initialState, action) =>
	{
		switch (action.type)
		{
			case fetchingActionType:
			{
				return {
					...state,
					loading: true,
					error  : undefined,
				};
			}
			case receivedActionType:
			{
				return {
					loading: false,
					data   : action.data,
					error  : undefined,
				};
			}
			case failedActionType:
			{
				return {
					...state,
					loading: false,
					error  : action.error,
				};
			}
			default:
				return state;
		}
	};

export default arrayReducer;
