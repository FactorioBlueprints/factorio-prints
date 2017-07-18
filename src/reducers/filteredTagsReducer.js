import {FILTER_ON_TAGS} from '../actions/actionTypes';

const initialState = [];
const filteredTagsReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case FILTER_ON_TAGS:
			return action.tags;
		default:
			return state;
	}
};

export default filteredTagsReducer;
