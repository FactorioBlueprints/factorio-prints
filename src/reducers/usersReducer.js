import {
	RECEIVED_USER_DISPLAY_NAME,
	SUBSCRIBED_TO_USER_DISPLAY_NAME,
	RECEIVED_USER_BLUEPRINTS,
	SUBSCRIBED_TO_USER_BLUEPRINTS,
} from '../actions/actionTypes';
import update from 'immutability-helper';

export const initialUserState =
	{
		displayName: {
			loading: false,
			data   : undefined,
		},
		blueprints : {
			loading: false,
			data   : {},
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
		case RECEIVED_USER_BLUEPRINTS:
			return update(state, {
				blueprints: {
					loading          : {$set: false},
					data             : {$set: action.userBlueprints},
					userBlueprintsRef: {$set: action.userBlueprintsRef},
				},
			});
		case SUBSCRIBED_TO_USER_BLUEPRINTS:
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
		case RECEIVED_USER_BLUEPRINTS:
		case SUBSCRIBED_TO_USER_BLUEPRINTS:
			return {
				...state,
				[action.userId]: userReducer(state[action.userId], action),
			};
		default:
			return state;
	}
};

export default usersReducer;
