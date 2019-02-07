import isString          from 'lodash/isString';
import {FILTER_ON_TITLE} from '../actions/actionTypes';

const initialState = '';

const titleFilterReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case FILTER_ON_TITLE:
		{
			const {title} = action;
			if (!isString(title))
			{
				throw new Error(action);
			}
			return title;
		}
		default:
			return state;
	}
};

export default titleFilterReducer;
