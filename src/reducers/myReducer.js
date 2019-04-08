import {combineReducers} from 'redux';
import {
	FETCHING_MY_AUTHORED_BLUEPRINT_KEYS,
	FETCHING_MY_ENTITLEMENTS,
	FETCHING_MY_FAVORITE_BLUEPRINT_KEYS,
	MY_AUTHORED_BLUEPRINT_KEYS_FAILED,
	MY_ENTITLEMENTS_FAILED,
	MY_FAVORITE_BLUEPRINT_KEYS_FAILED,
	RECEIVED_MY_AUTHORED_BLUEPRINT_KEYS,
	RECEIVED_MY_ENTITLEMENTS,
	RECEIVED_MY_FAVORITE_BLUEPRINT_KEYS,
}                        from '../actions/actionTypes';

const initialState = {
	loading: false,
	data   : [],
	error  : undefined,
};

const arrayReducer = (fetchingActionType, receivedActionType, failedActionType) =>
	(state = initialState, action) =>
	{
		switch (action.type)
		{
			case fetchingActionType:
			{
				return {
					loading: true,
					data   : [],
					error  : undefined,
				};
			}
			case receivedActionType:
			{
				return {
					loading: false,
					data   : action.data,
					error  : undefined,
				};
			}
			case failedActionType:
				return {
					loading: false,
					data   : [],
					error  : action.error,
				};
			default:
				return state;
		}
	};

const blueprints = arrayReducer(FETCHING_MY_AUTHORED_BLUEPRINT_KEYS, RECEIVED_MY_AUTHORED_BLUEPRINT_KEYS, MY_AUTHORED_BLUEPRINT_KEYS_FAILED);

const favorites = arrayReducer(FETCHING_MY_FAVORITE_BLUEPRINT_KEYS, RECEIVED_MY_FAVORITE_BLUEPRINT_KEYS, MY_FAVORITE_BLUEPRINT_KEYS_FAILED);

const entitlements = arrayReducer(FETCHING_MY_ENTITLEMENTS, RECEIVED_MY_ENTITLEMENTS, MY_ENTITLEMENTS_FAILED);

const rootReducer = combineReducers({
	blueprints,
	favorites,
	entitlements,
});

export default rootReducer;
