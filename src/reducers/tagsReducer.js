import {FETCHING_TAGS, RECEIVED_TAGS, TAGS_FAILED} from '../actions/actionTypes';

const initialState = {
	loading     : false,
	data        : [],
	tagHierarchy: {},
	error       : undefined,
};

const tagsReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case FETCHING_TAGS:
		{
			return {
				...state,
				loading: true,
				error  : undefined,
			};
		}
		case RECEIVED_TAGS:
		{
			return {
				loading     : false,
				data        : action.tags,
				tagHierarchy: action.tagHierarchy,
				error       : undefined,
			};
		}
		case TAGS_FAILED:
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

export default tagsReducer;
