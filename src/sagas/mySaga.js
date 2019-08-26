import isEmpty             from 'lodash/isEmpty';
import {call, put, select} from 'redux-saga/effects';
import * as actionTypes    from '../actions/actionTypes';

const getParams = idToken =>
	({
		headers: {
			Authorization: `Bearer ${idToken}`,
		},
	});

export const fetchMyAuthoredBlueprintKeysSaga = function*({user, idToken})
{
	if (isEmpty(idToken))
	{
		return;
	}

	yield put({type: actionTypes.FETCHING_MY_AUTHORED_BLUEPRINT_KEYS});

	try
	{
		const params   = yield call(getParams, idToken);
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/my/blueprints`,
			params,
		);

		if (response.ok)
		{
			const data = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_MY_AUTHORED_BLUEPRINT_KEYS, data});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.MY_AUTHORED_BLUEPRINT_KEYS_FAILED, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.MY_AUTHORED_BLUEPRINT_KEYS_FAILED, error});
	}
};

export const fetchMyFavoriteBlueprintKeysSaga = function*({user, idToken})
{
	if (isEmpty(idToken))
	{
		return;
	}

	yield put({type: actionTypes.FETCHING_MY_FAVORITE_BLUEPRINT_KEYS});

	try
	{
		const params   = yield call(getParams, idToken);
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/my/favorites`,
			params,
		);

		if (response.ok)
		{
			const data = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_MY_FAVORITE_BLUEPRINT_KEYS, data});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.MY_FAVORITE_BLUEPRINT_KEYS_FAILED, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.MY_FAVORITE_BLUEPRINT_KEYS_FAILED, error});
	}
};

export const fetchMyFavoriteSummariesSaga = function*({user, idToken})
{
	if (isEmpty(idToken))
	{
		return;
	}

	const getLoading = state => state.blueprintMyFavorites.loading;
	const isLoading  = yield select(getLoading);
	if (isLoading)
	{
		return;
	}

	yield put({type: actionTypes.SUBSCRIBED_TO_MY_FAVORITES});

	try
	{
		const params   = yield call(getParams, idToken);
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/my/favoriteBlueprints`,
			params,
		);

		if (response.ok)
		{
			const data = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_MY_FAVORITES, data});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.MY_FAVORITES_FAILED, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.MY_FAVORITES_FAILED, error});
	}
};


export const fetchMyEntitlementsSaga = function*({user, idToken})
{
	if (isEmpty(idToken))
	{
		return;
	}

	yield put({type: actionTypes.FETCHING_MY_ENTITLEMENTS});

	try
	{
		const params   = yield call(getParams, idToken);
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/my/entitlements`,
			params,
		);

		if (response.ok)
		{
			const data = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_MY_ENTITLEMENTS, data});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.MY_ENTITLEMENTS_FAILED, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.MY_ENTITLEMENTS_FAILED, error});
	}
};
