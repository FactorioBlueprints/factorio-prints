import reduceReducers                                        from 'reduce-reducers';
import {RECEIVED_ALL_FAVORITES, SUBSCRIBED_TO_ALL_FAVORITES} from '../actions/actionTypes';
import createCurrentPage                                     from './createCurrentPage';

const initialState = {
	currentPage  : 1,
	numberOfPages: 1,
	isLastPage   : false,
	loading      : false,
	data         : [],
};

const blueprintAllFavoritesReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case RECEIVED_ALL_FAVORITES:
		{
			const
				{
					blueprintAllFavoritesEnvelope: {
						_data,
						_metadata: {
							pagination: {
								pageNumber,
								numberOfPages,
							},
							transactionTimestamp,
						},
					},
				} = action;
			return {
				...state,
				data       : _data,
				currentPage: pageNumber,
				numberOfPages,
				loading    : false,
				transactionTimestamp,
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

const currentPageReducer = createCurrentPage('ALL_FAVORITES');

const summariesPageReducer = (state = initialState, action) =>
{
	const currentPage = currentPageReducer(state.currentPage, action);
	return {
		...state,
		currentPage,
	};
};
const rootReducer          = reduceReducers(blueprintAllFavoritesReducer, summariesPageReducer);

export default rootReducer;
