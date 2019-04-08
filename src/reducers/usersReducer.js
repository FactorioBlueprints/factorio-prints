import {combineReducers} from 'redux';

import {
	FETCHING_USER_BLUEPRINTS_SUMMARIES,
	FETCHING_USER_DISPLAY_NAME,
	RECEIVED_USER_BLUEPRINTS_SUMMARIES,
	RECEIVED_USER_DISPLAY_NAME,
	USER_BLUEPRINTS_SUMMARIES_FAILED,
	USER_DISPLAY_NAME_FAILED,
} from '../actions/actionTypes';

const displayNameInitialState = {
	loading: false,
	data   : undefined,
	error  : undefined,
};

const blueprintsInitialState = {
	loading: false,
	data   : [],
	error  : undefined,
};

export const initialUserState = {
	displayName: displayNameInitialState,
	blueprints : blueprintsInitialState,
};

// TOOD: Create "data-in-envelope reducer"

const displayNameReducer = (state = displayNameInitialState, action) =>
{
	switch (action.type)
	{
		case FETCHING_USER_DISPLAY_NAME:
		{
			return {
				...state,
				loading: true,
				error  : undefined,
			};
		}
		case USER_DISPLAY_NAME_FAILED:
		{
			return {
				...displayNameInitialState,
				error: action.error,
			};
		}
		case RECEIVED_USER_DISPLAY_NAME:
		{
			const
				{
					data: {
						_data,
						_metadata: {
							transactionTimestamp,
						},
					},
				} = action;
			return {
				...state,
				data   : _data,
				loading: false,
				transactionTimestamp,
			};
		}
		default:
			return state;
	}
};

const userSummariesReducer = (state = blueprintsInitialState, action) =>
{
	switch (action.type)
	{
		case FETCHING_USER_BLUEPRINTS_SUMMARIES:
		{
			return {
				...state,
				loading: true,
			};
		}
		case USER_BLUEPRINTS_SUMMARIES_FAILED:
		{
			return {
				...blueprintsInitialState,
				error: action.error,
			};
		}
		case RECEIVED_USER_BLUEPRINTS_SUMMARIES:
		{
			const
				{
					data: {
						_data,
						_metadata: {
							transactionTimestamp,
						},
					},
				} = action;
			return {
				...state,
				data   : _data,
				loading: false,
				transactionTimestamp,
			};
		}
		default:
			return state;
	}
};

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
