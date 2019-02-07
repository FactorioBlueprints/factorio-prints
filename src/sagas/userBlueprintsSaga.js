import isEmpty                        from 'lodash/isEmpty';
import keys                           from 'lodash/keys';
import pickBy                         from 'lodash/pickBy';
import sortBy                         from 'lodash/sortBy';
import {END, eventChannel}            from 'redux-saga';
import {all, call, put, select, take} from 'redux-saga/effects';
import * as actionTypes               from '../actions/actionTypes';
import {app}                          from '../base';

const displayNameData = userId =>
	eventChannel((emit) =>
	{
		const displayNameRef = app.database().ref(`/users/${userId}/displayName/`);
		const onValueChange  = (dataSnapshot) =>
		{
			const displayName = dataSnapshot.val();
			emit({displayName, displayNameRef});
		};

		// TODO: Why do I get here twice?
		displayNameRef.off();
		displayNameRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			displayNameRef.off('value', onValueChange);
		};
	});

export const subscribeToDisplayNameSaga = function*({userId})
{
	const getUser = state => state.users[userId];

	const userState = yield select(getUser);
	if (!userState || isEmpty(userState.displayName) || isEmpty(userState.displayName.data) || !userState.displayName.displayNameRef)
	{
		const channel = yield call(displayNameData, userId);
		yield put({type: actionTypes.SUBSCRIBED_TO_USER_DISPLAY_NAME, userId});
		try
		{
			while (true)
			{
				const {displayName, displayNameRef} = yield take(channel);
				yield put({type: actionTypes.RECEIVED_USER_DISPLAY_NAME, displayName, displayNameRef, userId});
			}
		}
		finally
		{
			console.log(`Unsubscribed from ${userId}'s displayName`);
		}
	}
};

// Anchor for diff
const userBlueprintsData = userId =>
	eventChannel((emit) =>
	{
		const userBlueprintsRef = app.database().ref(`/users/${userId}/blueprints/`);
		const onValueChange     = (dataSnapshot) =>
		{
			const userBlueprintsSnapshot = dataSnapshot.val();
			emit({userBlueprintsSnapshot, userBlueprintsRef});
		};

		userBlueprintsRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			userBlueprintsRef.off('value', onValueChange);
		};
	});

const subscribeToUserBlueprintsSaga = function*({userId})
{
	const getUser = state => state.users[userId];

	const userState = yield select(getUser);
	if (userState && !isEmpty(userState.blueprints) && !isEmpty(userState.blueprints.data) && userState.blueprints.userBlueprintsRef)
	{
		return;
	}

	const channel = yield call(userBlueprintsData, userId);
	yield put({type: actionTypes.SUBSCRIBED_TO_USER_DISPLAY_NAME, userId});
	try
	{
		while (true)
		{
			const {userBlueprintsSnapshot, userBlueprintsRef} = yield take(channel);

			// TODO: Test user that doesn't exist
			const userBlueprintsKeys = pickBy(userBlueprintsSnapshot);
			yield put({type: actionTypes.RECEIVED_USER_BLUEPRINTS_KEYS, userBlueprintsKeys, userBlueprintsRef, userId});

			const calls                     = keys(userBlueprintsKeys)
				.map(key => `/blueprintSummaries/${key}`)
				.map(url => app.database().ref(url))
				.map(ref => call(() => ref.once('value')));
			const blueprintSummarySnapshots = yield all(calls);
			const blueprintSummaries        = blueprintSummarySnapshots.map(each => ({key: each.key, ...each.val()}));
			const userBlueprints            = sortBy(blueprintSummaries, each => each.key);

			yield put({type: actionTypes.RECEIVED_USER_BLUEPRINTS_SUMMARIES, userBlueprints, userBlueprintsRef, userId});
		}
	}
	finally
	{
		console.log(`Unsubscribed from ${userId}'s blueprints`);
	}
};

export default subscribeToUserBlueprintsSaga;
