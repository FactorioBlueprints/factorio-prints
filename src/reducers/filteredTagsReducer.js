import isArray               from 'lodash/isArray';
import {SAVE_FILTER_ON_TAGS} from '../actions/actionTypes';

const initialState        = [];
const filteredTagsReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case SAVE_FILTER_ON_TAGS:
		{
			const {tags} = action;
			if (!isArray(tags))
			{
				throw new Error(action);
			}
			return tags;
		}
		default:
			return state;
	}
};

export default filteredTagsReducer;
