import forOwn  from 'lodash/forOwn';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import join    from 'lodash/join';

import {END, eventChannel}       from 'redux-saga';
import {call, put, select, take} from 'redux-saga/effects';
import * as actionTypes          from '../actions/actionTypes';

import {database} from '../base';
import {ref, onValue, off} from 'firebase/database';

import FirebasePaginatorByValue from '../FirebasePaginatorByValue';

const PAGE_SIZE = 60;

const blueprintData = blueprintId =>
	eventChannel((emit) =>
	{
		const blueprintRef = ref(database, `/blueprints/${blueprintId}/`);
		const onValueChange = (snapshot) =>
		{
			const blueprint = snapshot.val();
			emit({blueprint, blueprintRef});
		};

		// TODO: Why do I get here twice?
		const unsubscribe = onValue(blueprintRef, onValueChange, (error) =>
		{
			console.error('Blueprint data error:', error);
			emit(END);
		});

		return () =>
		{
			unsubscribe();
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

export const subscribeToSummariesSaga = function*()
{
	const getSummaries = state => state.blueprintSummaries;

	const blueprintSummariesState = yield select(getSummaries);
	if (!blueprintSummariesState.paginator)
	{
		const summariesRef = ref(database, '/blueprintSummaries/');
		const paginator = new FirebasePaginatorByValue(summariesRef, PAGE_SIZE, 'lastUpdatedDate');
		yield put({type: actionTypes.SUBSCRIBED_TO_SUMMARIES, paginator});
		yield call(paginator.start);
		yield put({type: actionTypes.RECEIVED_SUMMARIES, paginator});
	}
};

export const subscribeToAllFavoritesSaga = function*()
{
	const getAllFavorites = state => state.blueprintAllFavorites;

	const blueprintAllFavoritesState = yield select(getAllFavorites);
	if (!blueprintAllFavoritesState.paginator)
	{
		const summariesRef = ref(database, '/blueprintSummaries/');
		const paginator = new FirebasePaginatorByValue(summariesRef, PAGE_SIZE, 'numberOfFavorites');
		yield put({type: actionTypes.SUBSCRIBED_TO_ALL_FAVORITES, paginator});
		yield call(paginator.start);
		yield put({type: actionTypes.RECEIVED_ALL_FAVORITES, paginator});
	}
};

export const goToPreviousSummariesSaga = function*()
{
	const getPaginator = state => state.blueprintSummaries.paginator;
	const paginator    = yield select(getPaginator);
	yield call(paginator.previous);
	yield put({type: actionTypes.RECEIVED_SUMMARIES, paginator});
};

export const goToNextSummariesSaga = function*()
{
	const getPaginator = state => state.blueprintSummaries.paginator;
	const paginator    = yield select(getPaginator);
	yield call(paginator.next);
	yield put({type: actionTypes.RECEIVED_SUMMARIES, paginator});
};

export const goToFirstSummariesSaga = function*()
{
	const getPaginator = state => state.blueprintSummaries.paginator;
	const paginator    = yield select(getPaginator);
	yield call(paginator.first);
	yield put({type: actionTypes.RECEIVED_SUMMARIES, paginator});
};

export const goToPreviousAllFavoritesSaga = function*()
{
	const getPaginator = state => state.blueprintAllFavorites.paginator;
	const paginator    = yield select(getPaginator);
	yield call(paginator.previous);
	yield put({type: actionTypes.RECEIVED_ALL_FAVORITES, paginator});
};

export const goToNextAllFavoritesSaga = function*()
{
	const getPaginator = state => state.blueprintAllFavorites.paginator;
	const paginator    = yield select(getPaginator);
	yield call(paginator.next);
	yield put({type: actionTypes.RECEIVED_ALL_FAVORITES, paginator});
};

export const goToFirstAllFavoritesSaga = function*()
{
	const getPaginator = state => state.blueprintAllFavorites.paginator;
	const paginator    = yield select(getPaginator);
	yield call(paginator.first);
	yield put({type: actionTypes.RECEIVED_ALL_FAVORITES, paginator});
};

const tagsData = () =>
	eventChannel((emit) =>
	{
		const tagsRef = ref(database, '/tags/');
		const onValueChange = (snapshot) =>
		{
			const tagHierarchy = snapshot.val();
			emit({tagHierarchy, tagsRef});
		};

		// TODO: Why do I get here twice?
		const unsubscribe = onValue(tagsRef, onValueChange, (error) =>
		{
			console.error('Tags data error:', error);
			emit(END);
		});

		return () =>
		{
			unsubscribe();
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
				const tags                    = buildTagOptions(tagHierarchy);
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
		const byTagRef = ref(database, `/byTag/${tagId}`);
		const onValueChange = (snapshot) =>
		{
			const byTag = snapshot.val();
			emit({byTag, byTagRef});
		};

		// TODO: Why do I get here twice?
		const unsubscribe = onValue(byTagRef, onValueChange, (error) =>
		{
			console.error('Tag data error:', error);
			emit(END);
		});

		return () =>
		{
			unsubscribe();
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

const moderatorsData = () =>
	eventChannel((emit) =>
	{
		const moderatorsRef = ref(database, '/moderators/');
		const onValueChange = (snapshot) =>
		{
			const moderators = snapshot.val();
			emit({moderators, moderatorsRef});
		};

		// TODO: Why do I get here twice?
		const unsubscribe = onValue(moderatorsRef, onValueChange, (error) =>
		{
			console.error('Moderators data error:', error);
			emit(END);
		});

		return () =>
		{
			unsubscribe();
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
