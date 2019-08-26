import reduceReducers                                                           from 'reduce-reducers';
import {MY_FAVORITES_FAILED, RECEIVED_MY_FAVORITES, SUBSCRIBED_TO_MY_FAVORITES} from '../actions/actionTypes';
import createCurrentPage                                                        from './createCurrentPage';

const initialState = {
	currentPage  : 1,
	numberOfPages: 1,
	isLastPage   : false,
	loading      : false,
	data         : [],
};

const blueprintMyFavoritesReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case MY_FAVORITES_FAILED:
		{
			return {
				...initialState,
				error: action.error,
			};
		}
		case RECEIVED_MY_FAVORITES:
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
		case SUBSCRIBED_TO_MY_FAVORITES:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

const currentPageReducer = createCurrentPage('MY_FAVORITES');

const summariesPageReducer = (state = initialState, action) =>
{
	const currentPage = currentPageReducer(state.currentPage, action);
	return {
		...state,
		currentPage,
	};
};
const rootReducer          = reduceReducers(blueprintMyFavoritesReducer, summariesPageReducer);

export default rootReducer;
