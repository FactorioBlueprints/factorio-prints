import {debounce, takeEvery} from 'redux-saga/effects';

import {
	AUTH_STATE_CHANGED,
	FETCH_TAGS,
	FETCH_USER_BLUEPRINTS_SUMMARIES,
	FILTER_ON_TAGS,
	FILTER_ON_TITLE,
	FILTERED_ON_TAGS,
	FILTERED_ON_TITLE,
	GO_TO_FIRST_ALL_FAVORITES,
	GO_TO_FIRST_SUMMARIES,
	GO_TO_NEXT_ALL_FAVORITES,
	GO_TO_NEXT_SUMMARIES,
	GO_TO_PREVIOUS_ALL_FAVORITES,
	GO_TO_PREVIOUS_SUMMARIES,
	SUBSCRIBE_TO_ALL_FAVORITES,
	SUBSCRIBE_TO_BLUEPRINT,
	SUBSCRIBE_TO_SUMMARIES,
	SUBSCRIBE_TO_USER_DISPLAY_NAME,
	WENT_TO_FIRST_ALL_FAVORITES,
	WENT_TO_FIRST_SUMMARIES,
	WENT_TO_NEXT_ALL_FAVORITES,
	WENT_TO_NEXT_SUMMARIES,
	WENT_TO_PREVIOUS_ALL_FAVORITES,
	WENT_TO_PREVIOUS_SUMMARIES,
} from '../actions/actionTypes';

import {fetchMyAuthoredBlueprintKeysSaga, fetchMyEntitlementsSaga, fetchMyFavoriteBlueprintKeysSaga} from './mySaga';
import {
	fetchTagsSaga,
	filterTagsSaga,
	filterTitleSaga,
	goToFirstAllFavoritesSaga,
	goToFirstSummariesSaga,
	goToNextAllFavoritesSaga,
	goToNextSummariesSaga,
	goToPreviousAllFavoritesSaga,
	goToPreviousSummariesSaga,
	subscribeToAllFavoritesSaga,
	subscribeToBlueprintSaga,
	subscribeToSummariesSaga,
}                                                                                                    from './subscribeSaga';

import fetchUserBlueprintsSaga, {subscribeToDisplayNameSaga} from './userBlueprintsSaga';

const rootSaga = function*()
{
	yield takeEvery(SUBSCRIBE_TO_BLUEPRINT, subscribeToBlueprintSaga);

	yield takeEvery([SUBSCRIBE_TO_SUMMARIES, WENT_TO_FIRST_SUMMARIES, WENT_TO_NEXT_SUMMARIES, WENT_TO_PREVIOUS_SUMMARIES], subscribeToSummariesSaga);
	yield takeEvery([SUBSCRIBE_TO_ALL_FAVORITES, WENT_TO_FIRST_ALL_FAVORITES, WENT_TO_NEXT_ALL_FAVORITES, WENT_TO_PREVIOUS_ALL_FAVORITES], subscribeToAllFavoritesSaga);

	yield debounce(500, [FILTERED_ON_TITLE, FILTERED_ON_TAGS], subscribeToSummariesSaga);
	yield debounce(500, [FILTERED_ON_TITLE, FILTERED_ON_TAGS], subscribeToAllFavoritesSaga);

	yield takeEvery(FILTER_ON_TITLE, filterTitleSaga);
	yield takeEvery(FILTER_ON_TAGS, filterTagsSaga);

	yield takeEvery(FETCH_TAGS, fetchTagsSaga);
	yield takeEvery(SUBSCRIBE_TO_USER_DISPLAY_NAME, subscribeToDisplayNameSaga);
	yield takeEvery(FETCH_USER_BLUEPRINTS_SUMMARIES, fetchUserBlueprintsSaga);

	yield takeEvery(AUTH_STATE_CHANGED, subscribeToSummariesSaga);
	yield takeEvery(AUTH_STATE_CHANGED, subscribeToAllFavoritesSaga);
	yield takeEvery(AUTH_STATE_CHANGED, fetchMyAuthoredBlueprintKeysSaga);
	yield takeEvery(AUTH_STATE_CHANGED, fetchMyFavoriteBlueprintKeysSaga);
	yield takeEvery(AUTH_STATE_CHANGED, fetchMyEntitlementsSaga);

	yield takeEvery(GO_TO_PREVIOUS_SUMMARIES, goToPreviousSummariesSaga);
	yield takeEvery(GO_TO_NEXT_SUMMARIES, goToNextSummariesSaga);
	yield takeEvery(GO_TO_FIRST_SUMMARIES, goToFirstSummariesSaga);

	yield takeEvery(GO_TO_PREVIOUS_ALL_FAVORITES, goToPreviousAllFavoritesSaga);
	yield takeEvery(GO_TO_NEXT_ALL_FAVORITES, goToNextAllFavoritesSaga);
	yield takeEvery(GO_TO_FIRST_ALL_FAVORITES, goToFirstAllFavoritesSaga);
};

export default rootSaga;
