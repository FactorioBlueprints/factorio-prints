import isEmpty from 'lodash/isEmpty';

import {
	AUTH_STATE_CHANGED,
	EDITED_DISPLAY_NAME,
	RECEIVED_MY_FAVORITES_SUMMARIES,
	RECEIVED_MY_FAVORITES_KEYS,
} from '../actions/actionTypes';

const initialState = {
	loggedIn   : false,
	user       : {},
	myFavorites: {
		loading             : false,
		myFavoritesKeys     : {},
		myFavoritesSummaries: [],
	},
};

const authReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case AUTH_STATE_CHANGED:
		{
			const {user} = action;
			if (isEmpty(user))
			{
				return initialState;
			}
			return {
				...state,
				loggedIn: true,
				user,
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
		case RECEIVED_MY_FAVORITES_KEYS:
			return {
				...state,
				loggedIn   : true,
				myFavorites: {
					loading             : false,
					myFavoritesRef      : action.myFavoritesRef,
					myFavoritesKeys     : action.myFavoritesKeys,
					myFavoritesSummaries: [],
				},
			};
		case RECEIVED_MY_FAVORITES_SUMMARIES:
			return {
				...state,
				loggedIn   : true,
				myFavorites: {
					...state.myFavorites,
					loading             : false,
					myFavoritesRef      : action.myFavoritesRef,
					myFavoritesSummaries: action.myFavoritesSummaries,
				},
			};
		default:
			return state;
	}
};

export default authReducer;
