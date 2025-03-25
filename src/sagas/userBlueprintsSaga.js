import isEmpty                        from 'lodash/isEmpty';
import keys                           from 'lodash/keys';
import pickBy                         from 'lodash/pickBy';
import sortBy                         from 'lodash/sortBy';
import {END, eventChannel}            from 'redux-saga';
import {all, call, put, select, take} from 'redux-saga/effects';
import * as actionTypes               from '../actions/actionTypes';
import {database}                     from '../base';
import {ref, onValue, get}            from 'firebase/database';

const displayNameData = userId =>
	eventChannel((emit) =>
	{
		const displayNameRef = ref(database, `/users/${userId}/displayName/`);
		const onValueChange  = (snapshot) =>
		{
			const displayName = snapshot.val();
			emit({displayName, displayNameRef});
		};

		// TODO: Why do I get here twice?
		const unsubscribe = onValue(displayNameRef, onValueChange, (error) =>
		{
			console.error('Display name data error:', error);
			emit(END);
		});

		return () =>
		{
			unsubscribe();
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
		const userBlueprintsRef = ref(database, `/users/${userId}/blueprints/`);
		const onValueChange     = (snapshot) =>
		{
			const userBlueprintsSnapshot = snapshot.val();
			const exists                 = snapshot.exists();
			emit({userBlueprintsSnapshot, userBlueprintsRef, exists});
		};

		const unsubscribe = onValue(userBlueprintsRef, onValueChange, (error) =>
		{
			console.error('User blueprints data error:', error);
			emit(END);
		});

		return () =>
		{
			unsubscribe();
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
			const {userBlueprintsSnapshot, userBlueprintsRef, exists} = yield take(channel);

			if (exists)
			{
				const userBlueprintsKeys = pickBy(userBlueprintsSnapshot);
				yield put({
					type: actionTypes.RECEIVED_USER_BLUEPRINTS_KEYS,
					userBlueprintsKeys,
					userBlueprintsRef,
					userId,
					exists,
				});

				const calls = keys(userBlueprintsKeys)
					.map(key => `/blueprintSummaries/${key}`)
					.map(url => ref(database, url))
					.map(dbRef => call(() => get(dbRef)));
				const blueprintSummarySnapshots = yield all(calls);
				const blueprintSummaries = blueprintSummarySnapshots.map(each => ({key: each.key, ...each.val()}));
				const userBlueprints = sortBy(blueprintSummaries, each => each.key);

				yield put({
					type: actionTypes.RECEIVED_USER_BLUEPRINTS_SUMMARIES,
					userBlueprints,
					userBlueprintsRef,
					userId,
				});
			}
			else
			{
				yield put({type: actionTypes.RECEIVED_USER_BLUEPRINTS_KEYS, userId, exists});
			}
		}
	}
	finally
	{
		console.log(`Unsubscribed from ${userId}'s blueprints`);
	}
};

export default subscribeToUserBlueprintsSaga;
