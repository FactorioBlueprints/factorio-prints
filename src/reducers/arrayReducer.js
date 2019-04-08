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
					loading: true,
					data   : [],
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
				return {
					loading: false,
					data   : [],
					error  : action.error,
				};
			default:
				return state;
		}
	};

export default arrayReducer;
