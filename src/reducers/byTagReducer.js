import {RECEIVED_TAG, SUBSCRIBED_TO_TAG} from '../actions/actionTypes';

const initialState =
{
	loading: false,
	data   : {},
};

const tagReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_TAG:
			return {
				...state,
				loading : false,
				byTagRef: action.byTagRef,
				data    : action.byTag,
			};
		case SUBSCRIBED_TO_TAG:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

const initialStates = {};
const byTagReducer = (state = initialStates, action) =>
{
	switch (action.type)
	{
		case RECEIVED_TAG:
		case SUBSCRIBED_TO_TAG:
			return {
				...state,
				[action.tagId]: tagReducer(state[action.tagId], action),
			};
		default:
			return state;
	}
};

export default byTagReducer;
