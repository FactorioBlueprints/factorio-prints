import {
	RECEIVED_ALL_FAVORITES,
	SUBSCRIBED_TO_ALL_FAVORITES,
} from '../actions/actionTypes';

const initialState = {
	currentPage: 1,
	isLastPage : false,
	loading    : false,
	data       : [],
	paginator  : undefined,
};

const blueprintAllFavoritesReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_ALL_FAVORITES:
		{
			const {paginator, paginator: {currentPage, isLastPage, loading, data}} = action;
			return {
				...state,
				paginator,
				currentPage,
				isLastPage,
				loading,
				data,
			};
		}
		case SUBSCRIBED_TO_ALL_FAVORITES:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

export default blueprintAllFavoritesReducer;
