import {RECEIVED_MODERATORS, SUBSCRIBED_TO_MODERATORS} from '../actions/actionTypes';

const initialState
= {
	loading: false,
	data   : {},
};

const moderatorsReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_MODERATORS:
			return {
				...state,
				loading      : false,
				moderatorsRef: action.moderatorsRef,
				data         : action.moderators,
			};
		case SUBSCRIBED_TO_MODERATORS:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

export default moderatorsReducer;
