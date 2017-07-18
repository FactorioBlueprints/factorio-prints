import {RECEIVED_SUMMARIES, SUBSCRIBED_TO_SUMMARIES} from '../actions/actionTypes';

const initialState =
{
	loading: false,
	data   : {},
};

const blueprintSummariesReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_SUMMARIES:
			return {
				...state,
				loading              : false,
				blueprintSummariesRef: action.blueprintSummariesRef,
				data                 : action.blueprintSummaries,
			};
		case SUBSCRIBED_TO_SUMMARIES:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

export default blueprintSummariesReducer;
