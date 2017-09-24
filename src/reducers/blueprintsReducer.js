import {RECEIVED_BLUEPRINT, SUBSCRIBED_TO_BLUEPRINT} from '../actions/actionTypes';

export const initialBlueprintState =
{
	loading: false,
	data   : undefined,
};

const blueprintReducer = (state = initialBlueprintState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_BLUEPRINT:
		{
			const {blueprint} = action;
			if (blueprint && blueprint.favorites)
			{
				delete blueprint.favorites;
			}
			return {
				...state,
				loading     : false,
				blueprintRef: action.blueprintRef,
				data        : action.blueprint,
			};
		}
		case SUBSCRIBED_TO_BLUEPRINT:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

const blueprintsReducer = (state = {}, action) =>
{
	switch (action.type)
	{
		case RECEIVED_BLUEPRINT:
		case SUBSCRIBED_TO_BLUEPRINT:
			return {
				...state,
				[action.blueprintId]: blueprintReducer(state[action.blueprintId], action),
			};
		default:
			return state;
	}
};

export default blueprintsReducer;
