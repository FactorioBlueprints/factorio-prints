import reduceReducers                                                  from 'reduce-reducers';
import {RECEIVED_SUMMARIES, SUBSCRIBED_TO_SUMMARIES, SUMMARIES_FAILED} from '../actions/actionTypes';
import createCurrentPage                                               from './createCurrentPage';

const initialState = {
	currentPage  : 1,
	numberOfPages: 1,
	isLastPage   : false,
	loading      : false,
	data         : [],
};

const blueprintSummariesReducer = (state = initialState, action) =>
{
	switch (action.type)
	{
		case SUMMARIES_FAILED:
		{
			return {
				...initialState,
				error: action.error,
			};
		}
		case RECEIVED_SUMMARIES:
		{
			const
				{
					blueprintSummariesEnvelope: {
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
		case SUBSCRIBED_TO_SUMMARIES:
			return {
				...state,
				loading: true,
			};
		default:
			return state;
	}
};

const currentPageReducer = createCurrentPage('SUMMARIES');

const summariesPageReducer = (state = initialState, action) =>
{
	const currentPage = currentPageReducer(state.currentPage, action);
	return {
		...state,
		currentPage,
	};
};
const rootReducer          = reduceReducers(blueprintSummariesReducer, summariesPageReducer);

export default rootReducer;
