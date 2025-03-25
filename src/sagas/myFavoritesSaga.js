import isEmpty                from 'lodash/isEmpty';
import keys                   from 'lodash/keys';
import pickBy                 from 'lodash/pickBy';
import sortBy                 from 'lodash/sortBy';
import {END, eventChannel}    from 'redux-saga';
import {all, call, put, take} from 'redux-saga/effects';

import {RECEIVED_MY_FAVORITES_SUMMARIES, RECEIVED_MY_FAVORITES_KEYS} from '../actions/actionTypes';

import {database} from '../base';
import {ref, onValue, get} from 'firebase/database';

const myFavoritesData = userId =>
	eventChannel((emit) =>
	{
		const myFavoritesRef = ref(database, `/users/${userId}/favorites`);
		const onValueChange  = (snapshot) =>
		{
			const myFavorites = snapshot.val();
			emit({myFavorites, myFavoritesRef});
		};

		const unsubscribe = onValue(myFavoritesRef, onValueChange, (error) =>
		{
			console.error('My favorites data error:', error);
			emit(END);
		});

		return () =>
		{
			unsubscribe();
		};
	});

const myFavoritesSaga = function*({user})
{
	if (!isEmpty(user))
	{
		const {uid}   = user;
		const channel = yield call(myFavoritesData, uid);
		try
		{
			while (true)
			{
				const {myFavorites, myFavoritesRef} = yield take(channel);
				const myFavoritesKeys               = pickBy(myFavorites);
				yield put({type: RECEIVED_MY_FAVORITES_KEYS, myFavoritesKeys, myFavoritesRef});

				const calls = keys(myFavoritesKeys)
					.map(key => `/blueprintSummaries/${key}`)
					.map(url => ref(database, url))
					.map(dbRef => call(() => get(dbRef)));
				const blueprintSummarySnapshots = yield all(calls);
				const blueprintSummaries        = blueprintSummarySnapshots.map(each => ({key: each.key, ...each.val()}));
				const myFavoritesSummaries      = sortBy(blueprintSummaries, each => each.key);

				yield put({type: RECEIVED_MY_FAVORITES_SUMMARIES, myFavoritesSummaries, myFavoritesRef});
			}
		}
		finally
		{
			console.log('Unsubscribed from blueprintSummaries');
		}
	}
};

export default myFavoritesSaga;
