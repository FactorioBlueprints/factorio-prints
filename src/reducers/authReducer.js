import isEmpty from 'lodash/isEmpty';

import {
	AUTH_STATE_CHANGED,
	EDITED_DISPLAY_NAME,
} from '../actions/actionTypes';

const initialState = {
	loggedIn   : false,
	user       : {},
};

const authReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case AUTH_STATE_CHANGED:
		{
			const {user, idToken} = action;
			if (isEmpty(user))
			{
				return initialState;
			}
			return {
				...state,
				loggedIn: true,
				user,
				idToken,
			};
		}
		case EDITED_DISPLAY_NAME:
		{
			const {displayName} = action;
			return {
				...state,
				user: {
					...state.user,
					displayName,
				},
			};
		}
		default:
			return state;
	}
};

export default authReducer;
