import isEmpty          from 'lodash/isEmpty';
import {call, put}      from 'redux-saga/effects';
import * as actionTypes from '../actions/actionTypes';
import {app}            from '../base';

const getParams = function*()
{
	const {currentUser} = app.auth();
	if (isEmpty(currentUser))
	{
		return {};
	}

	const idToken = yield call(() => currentUser.getIdToken());

	const params = {
		headers: {
			Authorization: `Bearer ${idToken}`,
		},
	};
	return params;
};

export const fetchMyAuthoredBlueprintKeysSaga = function*()
{
	yield put({type: actionTypes.FETCHING_MY_AUTHORED_BLUEPRINT_KEYS});

	try
	{
		const params   = yield call(getParams);
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

export const fetchMyFavoriteBlueprintKeysSaga = function*()
{
	yield put({type: actionTypes.FETCHING_MY_FAVORITE_BLUEPRINT_KEYS});

	try
	{
		const params   = yield call(getParams);
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

export const fetchMyEntitlementsSaga = function*()
{
	yield put({type: actionTypes.FETCHING_MY_ENTITLEMENTS});

	try
	{
		const params   = yield call(getParams);
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
