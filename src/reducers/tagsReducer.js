import {RECEIVED_TAGS, SUBSCRIBED_TO_TAGS} from '../actions/actionTypes';

const initialState
= {
	loading     : false,
	data        : [],
	tagHierarchy: {},
};

const tagsReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_TAGS:
			return {
				...state,
				loading     : false,
				tagsRef     : action.tagsRef,
				data        : action.tags,
				tagHierarchy: action.tagHierarchy,
			};
		case SUBSCRIBED_TO_TAGS:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

export default tagsReducer;
