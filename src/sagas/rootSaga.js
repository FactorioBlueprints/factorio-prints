import {takeEvery} from 'redux-saga/effects';
import {
	subscribeToBlueprintSaga,
	subscribeToSummariesSaga,
	subscribeToModeratorsSaga,
	subscribeToTagsSaga,
	subscribeToTagSaga,
	subscribeToDisplayNameSaga,
	subscribeToUserBlueprintsSaga,
} from './subscribeSaga';

import authSaga from './authSaga';

import {
	SUBSCRIBE_TO_BLUEPRINT,
	SUBSCRIBE_TO_SUMMARIES,
	SUBSCRIBE_TO_MODERATORS,
	SUBSCRIBE_TO_TAGS,
	SUBSCRIBE_TO_USER,
	SUBSCRIBE_TO_TAG,
	AUTH_STATE_CHANGED,
} from '../actions/actionTypes';

const log = (action) =>
{
	console.log('log saga:', action);
};

function* rootSaga()
{
	// yield takeEvery('*', log);
	yield takeEvery(SUBSCRIBE_TO_BLUEPRINT, subscribeToBlueprintSaga);
	yield takeEvery(SUBSCRIBE_TO_SUMMARIES, subscribeToSummariesSaga);
	yield takeEvery(SUBSCRIBE_TO_MODERATORS, subscribeToModeratorsSaga);
	yield takeEvery(SUBSCRIBE_TO_TAGS, subscribeToTagsSaga);
	yield takeEvery(SUBSCRIBE_TO_TAG, subscribeToTagSaga);
	yield takeEvery(SUBSCRIBE_TO_USER, subscribeToDisplayNameSaga);
	yield takeEvery(SUBSCRIBE_TO_USER, subscribeToUserBlueprintsSaga);
	yield takeEvery(AUTH_STATE_CHANGED, authSaga);
}

export default rootSaga;
