import forOwn from 'lodash/forOwn';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import join from 'lodash/join';

import {END, eventChannel} from 'redux-saga';
import {call, put, select, take} from 'redux-saga/effects';

import * as actionTypes from '../actions/actionTypes';

import {app} from '../base';

const blueprintData = blueprintId =>
	eventChannel((emit) =>
	{
		const blueprintRef = app.database().ref(`/blueprints/${blueprintId}/`);
		const onValueChange = (dataSnapshot) =>
		{
			const blueprint = dataSnapshot.val();
			emit({blueprint, blueprintRef});
		};

		// TODO: Why do I get here twice?
		blueprintRef.off();
		blueprintRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			blueprintRef.off('value', onValueChange);
		};
	});

export const subscribeToBlueprintSaga = function*({blueprintId})
{
	const getBlueprint = state => state.blueprints[blueprintId];

	const blueprintState = yield select(getBlueprint);
	if (!blueprintState || isEmpty(blueprintState.data) || !blueprintState.blueprintRef)
	{
		const channel = yield call(blueprintData, blueprintId);
		yield put({type: actionTypes.SUBSCRIBED_TO_BLUEPRINT, blueprintId});
		try
		{
			while (true)
			{
				const {blueprint, blueprintRef} = yield take(channel);
				yield put({type: actionTypes.RECEIVED_BLUEPRINT, blueprint, blueprintRef, blueprintId});
			}
		}
		finally
		{
			console.log(`Unsubscribed from ${blueprintId}`);
		}
	}
};

const blueprintSummariesData = () =>
	eventChannel((emit) =>
	{
		const blueprintSummariesRef = app.database().ref('/blueprintSummaries/');
		const onValueChange = (dataSnapshot) =>
		{
			const blueprintSummaries = dataSnapshot.val();
			emit({blueprintSummaries, blueprintSummariesRef});
		};

		// TODO: Why do I get here twice?
		blueprintSummariesRef.off();
		blueprintSummariesRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			blueprintSummariesRef.off('value', onValueChange);
		};
	});

export const subscribeToSummariesSaga = function*()
{
	const getSummaries = state => state.blueprintSummaries;

	const blueprintSummariesState = yield select(getSummaries);
	if (isEmpty(blueprintSummariesState.data) || !blueprintSummariesState.blueprintSummariesRef)
	{
		const channel = yield call(blueprintSummariesData);
		yield put({type: actionTypes.SUBSCRIBED_TO_SUMMARIES});
		try
		{
			while (true)
			{
				const {blueprintSummaries, blueprintSummariesRef} = yield take(channel);
				yield put({type: actionTypes.RECEIVED_SUMMARIES, blueprintSummaries, blueprintSummariesRef});
			}
		}
		finally
		{
			console.log('Unsubscribed from blueprintSummaries');
		}
	}
};

const tagsData = () =>
	eventChannel((emit) =>
	{
		const tagsRef = app.database().ref('/tags/');
		const onValueChange = (dataSnapshot) =>
		{
			const tagHierarchy = dataSnapshot.val();
			emit({tagHierarchy, tagsRef});
		};

		// TODO: Why do I get here twice?
		tagsRef.off();
		tagsRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			tagsRef.off('value', onValueChange);
		};
	});

const buildTagOptionsRecursive = (tagHierarchyNode, pathArray, result) =>
{
	forOwn(tagHierarchyNode, (value, key) =>
	{
		if (isArray(value))
		{
			value.forEach(eachValue => result.push(`${join(pathArray, '/')}/${key}/${eachValue}/`));
		}
		else
		{
			const newPathArray = [
				...pathArray,
				key,
			];
			buildTagOptionsRecursive(value, newPathArray, result);
		}
	});
};

const buildTagOptions = (tagHierarchy) =>
{
	const result = [];
	buildTagOptionsRecursive(tagHierarchy, [], result);
	return result;
};

export const subscribeToTagsSaga = function*()
{
	const getTags = state => state.tags;

	const tagsState = yield select(getTags);
	if (isEmpty(tagsState.data) || !tagsState.tagsRef)
	{
		const channel = yield call(tagsData);
		yield put({type: actionTypes.SUBSCRIBED_TO_TAGS});
		try
		{
			while (true)
			{
				const {tagHierarchy, tagsRef} = yield take(channel);
				const tags = buildTagOptions(tagHierarchy);
				yield put({type: actionTypes.RECEIVED_TAGS, tags, tagHierarchy, tagsRef});
			}
		}
		finally
		{
			console.log('Unsubscribed from tags');
		}
	}
};

const tagData = tagId =>
	eventChannel((emit) =>
	{
		const byTagRef = app.database().ref(`/byTag${tagId}`);
		const onValueChange = (dataSnapshot) =>
		{
			const byTag = dataSnapshot.val();
			emit({byTag, byTagRef});
		};

		// TODO: Why do I get here twice?
		byTagRef.off();
		byTagRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			byTagRef.off('value', onValueChange);
		};
	});

export const subscribeToTagSaga = function*({tagId})
{
	const getByTag = state => state.byTag[tagId];

	const byTagState = yield select(getByTag);
	if (!byTagState || isEmpty(byTagState.data) || !byTagState.byTagRef)
	{
		const channel = yield call(tagData, tagId);
		yield put({type: actionTypes.SUBSCRIBED_TO_TAG, tagId});
		try
		{
			while (true)
			{
				const {byTag, byTagRef} = yield take(channel);
				yield put({type: actionTypes.RECEIVED_TAG, byTag, byTagRef, tagId});
			}
		}
		finally
		{
			console.log(`Unsubscribed from tag ${tagId}`);
		}
	}
};

const displayNameData = userId =>
	eventChannel((emit) =>
	{
		const displayNameRef = app.database().ref(`/users/${userId}/displayName/`);
		const onValueChange = (dataSnapshot) =>
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

const userBlueprintsData = userId =>
	eventChannel((emit) =>
	{
		const userBlueprintsRef = app.database().ref(`/users/${userId}/blueprints/`);
		const onValueChange = (dataSnapshot) =>
		{
			const userBlueprints = dataSnapshot.val() || {};
			emit({userBlueprints, userBlueprintsRef});
		};

		// TODO: Why do I get here twice?
		userBlueprintsRef.off();
		userBlueprintsRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			userBlueprintsRef.off('value', onValueChange);
		};
	});

export const subscribeToUserBlueprintsSaga = function*({userId})
{
	const getUser = state => state.users[userId];

	const userState = yield select(getUser);
	if (!userState || isEmpty(userState.blueprints) || isEmpty(userState.blueprints.data) || !userState.blueprints.userBlueprintsRef)
	{
		const channel = yield call(userBlueprintsData, userId);
		yield put({type: actionTypes.SUBSCRIBED_TO_USER_DISPLAY_NAME, userId});
		try
		{
			while (true)
			{
				const {userBlueprints, userBlueprintsRef} = yield take(channel);
				yield put({
					type: actionTypes.RECEIVED_USER_BLUEPRINTS,
					userBlueprints,
					userBlueprintsRef,
					userId});
			}
		}
		finally
		{
			console.log(`Unsubscribed from ${userId}'s blueprints`);
		}
	}
};

const moderatorsData = () =>
	eventChannel((emit) =>
	{
		const moderatorsRef = app.database().ref('/moderators/');
		const onValueChange = (dataSnapshot) =>
		{
			const moderators = dataSnapshot.val();
			emit({moderators, moderatorsRef});
		};

		// TODO: Why do I get here twice?
		moderatorsRef.off();
		moderatorsRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			moderatorsRef.off('value', onValueChange);
		};
	});

export const subscribeToModeratorsSaga = function*()
{
	const getModerators = state => state.moderators;

	const moderatorsState = yield select(getModerators);
	if (isEmpty(moderatorsState.data) || !moderatorsState.moderatorsRef)
	{
		const channel = yield call(moderatorsData);
		yield put({type: actionTypes.SUBSCRIBED_TO_MODERATORS});
		try
		{
			while (true)
			{
				const {moderators, moderatorsRef} = yield take(channel);
				yield put({type: actionTypes.RECEIVED_MODERATORS, moderators, moderatorsRef});
			}
		}
		finally
		{
			console.log('Unsubscribed from moderators');
		}
	}
};

