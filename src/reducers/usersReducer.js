import update from 'immutability-helper';

import {
	RECEIVED_USER_BLUEPRINTS_KEYS,
	RECEIVED_USER_BLUEPRINTS_SUMMARIES,
	RECEIVED_USER_DISPLAY_NAME,
	SUBSCRIBED_TO_USER_BLUEPRINTS_SUMMARIES,
	SUBSCRIBED_TO_USER_DISPLAY_NAME,
} from '../actions/actionTypes';

export const initialUserState = {
	displayName: {
		loading: false,
		data   : undefined,
	},
	blueprints: {
		loading           : false,
		userBlueprintsKeys: {},
		userBlueprints    : [],
	},
};

const userReducer = (state = initialUserState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_USER_DISPLAY_NAME:
			return update(state, {
				displayName: {
					loading       : {$set: false},
					data          : {$set: action.displayName},
					displayNameRef: {$set: action.displayNameRef},
				},
			});
		case SUBSCRIBED_TO_USER_DISPLAY_NAME:
			return update(state, {
				displayName: {
					loading: {$set: true},
				},
			});
		case RECEIVED_USER_BLUEPRINTS_KEYS:
			return update(state, {
				blueprints: {
					loading           : {$set: false},
					userBlueprintsKeys: {$set: action.userBlueprintsKeys},
					userBlueprintsRef : {$set: action.userBlueprintsRef},
					exists            : {$set: action.exists},
				},
			});
		case RECEIVED_USER_BLUEPRINTS_SUMMARIES:
			return update(state, {
				blueprints: {
					loading          : {$set: false},
					userBlueprints   : {$set: action.userBlueprints},
					userBlueprintsRef: {$set: action.userBlueprintsRef},
				},
			});
		case SUBSCRIBED_TO_USER_BLUEPRINTS_SUMMARIES:
			return update(state, {
				blueprints: {
					loading: {$set: true},
				},
			});
		default:
			return state;
	}
};

const usersReducer = (state = {}, action) =>
{
	switch (action.type)
	{
		case RECEIVED_USER_DISPLAY_NAME:
		case SUBSCRIBED_TO_USER_DISPLAY_NAME:
		case RECEIVED_USER_BLUEPRINTS_SUMMARIES:
		case RECEIVED_USER_BLUEPRINTS_KEYS:
		case SUBSCRIBED_TO_USER_BLUEPRINTS_SUMMARIES:
			return {
				...state,
				[action.userId]: userReducer(state[action.userId], action),
			};
		default:
			return state;
	}
};

export default usersReducer;
