import isEmpty                        from 'lodash/isEmpty';
import keys                           from 'lodash/keys';
import pickBy                         from 'lodash/pickBy';
import sortBy                         from 'lodash/sortBy';
import {END, eventChannel}            from 'redux-saga';
import {all, call, put, select, take} from 'redux-saga/effects';
import * as actionTypes               from '../actions/actionTypes';
import {app}                          from '../base';

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
			yield put({type: actionTypes.RECEIVED_USER_DISPLAY_NAME, data});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.USER_DISPLAY_NAME_FAILED, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.MY_AUTHORED_BLUEPRINT_KEYS_FAILED, error});
	}
};

const subscribeToUserBlueprintsSaga = function*({authorId})
{
	// RECEIVED_USER_BLUEPRINTS_SUMMARIES

	yield put({type: actionTypes.SUBSCRIBED_TO_USER_BLUEPRINTS_SUMMARIES});

	const getParams = function*()
	{
		const {currentUser} = app.auth();
		if (isEmpty(currentUser))
		{
			return {};
		}

		const idToken     = yield call(() => currentUser.getIdToken());

		const params = {
			headers: {
				Authorization: `Bearer ${idToken}`,
			},
		};
		return params;
	};

	try
	{
		const params = yield call(getParams);
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/user/${authorId}/blueprintSummaries/`,
			params,
		);

		if (response.ok)
		{
			const userBlueprintSummariesEnvelope = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_USER_BLUEPRINTS_SUMMARIES, userBlueprintSummariesEnvelope});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.USER_BLUEPRINTS_SUMMARIES_FAILED, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.USER_BLUEPRINTS_SUMMARIES_FAILED, error});
	}
};

export default subscribeToUserBlueprintsSaga;
