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

const subscribeToUserBlueprintsSaga = function*({userId})
{
	// /user/{authorId}/blueprintSummaries/page/{pageNumber}
	// RECEIVED_USER_BLUEPRINTS_SUMMARIES

	const getFilteredTags = state => state.filteredTags;
	const getTitleFilter = state => state.titleFilter;
	const getCurrentPage = state => state.blueprintMyFavorites.currentPage;
	const filteredTags = yield select(getFilteredTags);
	const titleFilter = yield select(getTitleFilter);
	const currentPage = yield select(getCurrentPage);

	yield put({type: actionTypes.SUBSCRIBED_TO_MY_FAVORITES, filteredTags, titleFilter});

	const urlSearchParams = new URLSearchParams();

	if (!isEmpty(titleFilter))
	{
		urlSearchParams.append('title',  titleFilter);
	}

	if (!isEmpty(filteredTags))
	{
		urlSearchParams.append('tag',  filteredTags);
	}

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
			`${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/favorites/filtered/page/${currentPage}?${urlSearchParams.toString()}`,
			params,
		);

		if (response.ok)
		{
			const blueprintMyFavoritesEnvelope = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_MY_FAVORITES, blueprintMyFavoritesEnvelope, titleFilter, filteredTags});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.MY_FAVORITES_FAILED, titleFilter, filteredTags, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.MY_FAVORITES_FAILED, titleFilter, filteredTags, error});
	}
};

export default subscribeToUserBlueprintsSaga;
