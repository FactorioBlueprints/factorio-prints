import {call, put}      from 'redux-saga/effects';
import * as actionTypes from '../actions/actionTypes';

export const subscribeToDisplayNameSaga = function*({userId})
{
	yield put({type: actionTypes.FETCHING_USER_DISPLAY_NAME, userId});

	try
	{
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/user/${userId}/displayName`,
		);

		if (response.ok)
		{
			const data = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_USER_DISPLAY_NAME, data, userId});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.USER_DISPLAY_NAME_FAILED, error, userId});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.MY_AUTHORED_BLUEPRINT_KEYS_FAILED, error, userId});
	}
};

const fetchUserBlueprintsSaga = function*({userId})
{
	yield put({type: actionTypes.FETCHING_USER_BLUEPRINTS_SUMMARIES, userId});

	try
	{
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/user/${userId}/blueprintSummaries/`,
		);

		if (response.ok)
		{
			const data = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_USER_BLUEPRINTS_SUMMARIES, data, userId});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.USER_BLUEPRINTS_SUMMARIES_FAILED, error, userId});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.USER_BLUEPRINTS_SUMMARIES_FAILED, error, userId});
	}
};

export default fetchUserBlueprintsSaga;
