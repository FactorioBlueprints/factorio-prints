import isEmpty             from 'lodash/isEmpty';
import {call, put, select} from 'redux-saga/effects';
import * as actionTypes    from '../actions/actionTypes';

import {app} from '../base';

export const subscribeToBlueprintSaga = function*({blueprintId})
{
	yield put({type: actionTypes.SUBSCRIBED_TO_BLUEPRINT, blueprintId});

	try
	{
		const response = yield call(fetch, `${process.env.REACT_APP_REST_URL}/api/blueprint/${blueprintId}`);
		if (response.ok)
		{
			const blueprint = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_BLUEPRINT, blueprint, blueprintId});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.RECEIVED_BLUEPRINT, blueprint: undefined, blueprintId, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.BLUEPRINT_FAILED, blueprintId, error});
	}
};

export const subscribeToSummariesSaga = function*()
{
	const getLoading = state => state.blueprintSummaries.loading;
	const isLoading  = yield select(getLoading);
	if (isLoading)
	{
		return;
	}

	const getFilteredTags = state => state.filteredTags;
	const getTitleFilter  = state => state.titleFilter;
	const getCurrentPage  = state => state.blueprintSummaries.currentPage;
	const filteredTags    = yield select(getFilteredTags);
	const titleFilter     = yield select(getTitleFilter);
	const currentPage     = yield select(getCurrentPage);

	yield put({type: actionTypes.SUBSCRIBED_TO_SUMMARIES, filteredTags, titleFilter});

	const urlSearchParams = new URLSearchParams();

	if (!isEmpty(titleFilter))
	{
		urlSearchParams.append('title', titleFilter);
	}

	if (!isEmpty(filteredTags))
	{
		urlSearchParams.append('tag', filteredTags);
	}

	try
	{
		const response = yield call(fetch, `${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/filtered/page/${currentPage}?${urlSearchParams.toString()}`);

		if (response.ok)
		{
			const blueprintSummariesEnvelope = yield call(() => response.json());
			yield put({type: actionTypes.RECEIVED_SUMMARIES, blueprintSummariesEnvelope, titleFilter, filteredTags});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.SUMMARIES_FAILED, titleFilter, filteredTags, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.SUMMARIES_FAILED, titleFilter, filteredTags, error});
	}
};

export const filterTitleSaga = function*({title})
{
	yield put({type: actionTypes.SAVE_FILTER_ON_TITLE, title});
	yield put({type: actionTypes.FILTERED_ON_TITLE});
};

export const filterTagsSaga = function*(arg)
{
	const {tags} = arg;

	yield put({type: actionTypes.SAVE_FILTER_ON_TAGS, tags});
	yield put({type: actionTypes.FILTERED_ON_TAGS});
};

export const subscribeToAllFavoritesSaga = function*()
{
	const getLoading = state => state.blueprintAllFavorites.loading;
	const isLoading  = yield select(getLoading);
	if (isLoading)
	{
		return;
	}

	const getFilteredTags = state => state.filteredTags;
	const getTitleFilter  = state => state.titleFilter;
	const getCurrentPage  = state => state.blueprintAllFavorites.currentPage;
	const filteredTags    = yield select(getFilteredTags);
	const titleFilter     = yield select(getTitleFilter);
	const currentPage     = yield select(getCurrentPage);

	yield put({type: actionTypes.SUBSCRIBED_TO_ALL_FAVORITES, filteredTags, titleFilter});

	const urlSearchParams = new URLSearchParams();

	if (!isEmpty(titleFilter))
	{
		urlSearchParams.append('title', titleFilter);
	}

	if (!isEmpty(filteredTags))
	{
		urlSearchParams.append('tag', filteredTags);
	}

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

	try
	{
		const params   = yield call(getParams);
		const response = yield call(
			fetch,
			`${process.env.REACT_APP_REST_URL}/api/blueprintSummaries/top/page/${currentPage}?${urlSearchParams.toString()}`,
			params,
		);

		if (response.ok)
		{
			const blueprintAllFavoritesEnvelope = yield call(() => response.json());
			yield put({
				type: actionTypes.RECEIVED_ALL_FAVORITES,
				blueprintAllFavoritesEnvelope,
				titleFilter,
				filteredTags,
			});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.ALL_FAVORITES_FAILED, titleFilter, filteredTags, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.ALL_FAVORITES_FAILED, titleFilter, filteredTags, error});
	}
};

export const goToPreviousSummariesSaga = function*()
{
	yield put({type: actionTypes.SAVE_PREVIOUS_SUMMARIES});
	yield put({type: actionTypes.WENT_TO_PREVIOUS_SUMMARIES});
};

export const goToNextSummariesSaga = function*()
{
	yield put({type: actionTypes.SAVE_NEXT_SUMMARIES});
	yield put({type: actionTypes.WENT_TO_NEXT_SUMMARIES});
};

export const goToFirstSummariesSaga = function*()
{
	yield put({type: actionTypes.SAVE_FIRST_SUMMARIES});
	yield put({type: actionTypes.WENT_TO_FIRST_SUMMARIES});
};

export const goToPreviousAllFavoritesSaga = function*()
{
	yield put({type: actionTypes.SAVE_PREVIOUS_ALL_FAVORITES});
	yield put({type: actionTypes.WENT_TO_PREVIOUS_ALL_FAVORITES});
};

export const goToNextAllFavoritesSaga = function*()
{
	yield put({type: actionTypes.SAVE_NEXT_ALL_FAVORITES});
	yield put({type: actionTypes.WENT_TO_NEXT_ALL_FAVORITES});
};

export const goToFirstAllFavoritesSaga = function*()
{
	yield put({type: actionTypes.SAVE_FIRST_ALL_FAVORITES});
	yield put({type: actionTypes.WENT_TO_FIRST_ALL_FAVORITES});
};

export const fetchTagsSaga = function*()
{
	const getTags   = state => state.tags;
	const tagsState = yield select(getTags);
	if (!isEmpty(tagsState.data))
	{
		return;
	}

	yield put({type: actionTypes.FETCHING_TAGS});
	try
	{
		const response = yield call(fetch, `${process.env.REACT_APP_REST_URL}/api/tags/`);
		if (response.ok)
		{
			const tagsData = yield call(() => response.json());
			const tags     = tagsData.map(each => `/${each.category}/${each.name}/`);
			yield put({type: actionTypes.RECEIVED_TAGS, tags});
		}
		else
		{
			const error = yield call(() => response.text());
			console.log(error);
			yield put({type: actionTypes.TAGS_FAILED, error});
		}
	}
	catch (error)
	{
		console.log(error);
		yield put({type: actionTypes.TAGS_FAILED, error});
	}
};
