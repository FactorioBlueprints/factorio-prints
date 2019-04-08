import update            from 'immutability-helper';
import {combineReducers} from 'redux';

import {
	FETCHING_USER_BLUEPRINTS_SUMMARIES,
	FETCHING_USER_DISPLAY_NAME,
	RECEIVED_USER_BLUEPRINTS_SUMMARIES,
	RECEIVED_USER_DISPLAY_NAME,
	USER_BLUEPRINTS_SUMMARIES_FAILED,
}                   from '../actions/actionTypes';
import arrayReducer from './arrayReducer';

const displayNameInitialState = {
	loading: false,
	data   : undefined,
	error  : undefined,
};

export const initialUserState = {
	displayName: displayNameInitialState,
	blueprints : {
		loading: false,
		data   : [],
		error  : undefined,
	},
};

const displayNameReducer = (state = displayNameInitialState, action) =>
{
	switch (action.type)
	{
		case FETCHING_USER_DISPLAY_NAME:
			return update(state, {
				loading: {$set: true},
				error  : undefined,
			});
		case RECEIVED_USER_DISPLAY_NAME:
			return update(state, {
				loading: {$set: false},
				data   : {$set: action.displayName},
				error  : undefined,
			});
		default:
			return state;
	}
};

const userSummariesReducer = arrayReducer(FETCHING_USER_BLUEPRINTS_SUMMARIES, RECEIVED_USER_BLUEPRINTS_SUMMARIES, USER_BLUEPRINTS_SUMMARIES_FAILED);

const userReducer = combineReducers({
	displayName: displayNameReducer,
	blueprints : userSummariesReducer,
});

const usersReducer = (state = {}, action) =>
{
	switch (action.type)
	{
		case RECEIVED_USER_DISPLAY_NAME:
		case FETCHING_USER_DISPLAY_NAME:
		case FETCHING_USER_BLUEPRINTS_SUMMARIES:
		case RECEIVED_USER_BLUEPRINTS_SUMMARIES:
		case USER_BLUEPRINTS_SUMMARIES_FAILED:
			return {
				...state,
				[action.userId]: userReducer(state[action.userId], action),
			};
		default:
			return state;
	}
};

export default usersReducer;
