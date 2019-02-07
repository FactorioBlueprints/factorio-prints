import {takeEvery} from 'redux-saga/effects';

import {
	AUTH_STATE_CHANGED,
	GO_TO_FIRST_ALL_FAVORITES,
	GO_TO_FIRST_SUMMARIES,
	GO_TO_NEXT_ALL_FAVORITES,
	GO_TO_NEXT_SUMMARIES,
	GO_TO_PREVIOUS_ALL_FAVORITES,
	GO_TO_PREVIOUS_SUMMARIES,
	SUBSCRIBE_TO_ALL_FAVORITES,
	SUBSCRIBE_TO_BLUEPRINT,
	SUBSCRIBE_TO_MODERATORS,
	SUBSCRIBE_TO_SUMMARIES,
	SUBSCRIBE_TO_TAG,
	SUBSCRIBE_TO_TAGS,
	SUBSCRIBE_TO_USER,
	SUBSCRIBE_TO_USER_DISPLAY_NAME,
} from '../actions/actionTypes';

import myFavoritesSaga from './myFavoritesSaga';

import {
	goToFirstAllFavoritesSaga,
	goToFirstSummariesSaga,
	goToNextAllFavoritesSaga,
	goToNextSummariesSaga,
	goToPreviousAllFavoritesSaga,
	goToPreviousSummariesSaga,
	subscribeToAllFavoritesSaga,
	subscribeToBlueprintSaga,
	subscribeToModeratorsSaga,
	subscribeToSummariesSaga,
	subscribeToTagSaga,
	subscribeToTagsSaga,
} from './subscribeSaga';

import subscribeToUserBlueprintsSaga, {subscribeToDisplayNameSaga} from './userBlueprintsSaga';

const rootSaga = function*()
{
	yield takeEvery(SUBSCRIBE_TO_BLUEPRINT, subscribeToBlueprintSaga);
	yield takeEvery(SUBSCRIBE_TO_SUMMARIES, subscribeToSummariesSaga);
	yield takeEvery(SUBSCRIBE_TO_ALL_FAVORITES, subscribeToAllFavoritesSaga);
	yield takeEvery(SUBSCRIBE_TO_MODERATORS, subscribeToModeratorsSaga);
	yield takeEvery(SUBSCRIBE_TO_TAGS, subscribeToTagsSaga);
	yield takeEvery(SUBSCRIBE_TO_TAG, subscribeToTagSaga);
	yield takeEvery(SUBSCRIBE_TO_USER, subscribeToDisplayNameSaga);
	yield takeEvery(SUBSCRIBE_TO_USER, subscribeToUserBlueprintsSaga);
	yield takeEvery(SUBSCRIBE_TO_USER_DISPLAY_NAME, subscribeToDisplayNameSaga);
	yield takeEvery(AUTH_STATE_CHANGED, myFavoritesSaga);
	yield takeEvery(GO_TO_PREVIOUS_SUMMARIES, goToPreviousSummariesSaga);
	yield takeEvery(GO_TO_NEXT_SUMMARIES, goToNextSummariesSaga);
	yield takeEvery(GO_TO_FIRST_SUMMARIES, goToFirstSummariesSaga);
	yield takeEvery(GO_TO_PREVIOUS_ALL_FAVORITES, goToPreviousAllFavoritesSaga);
	yield takeEvery(GO_TO_NEXT_ALL_FAVORITES, goToNextAllFavoritesSaga);
	yield takeEvery(GO_TO_FIRST_ALL_FAVORITES, goToFirstAllFavoritesSaga);
};

export default rootSaga;
