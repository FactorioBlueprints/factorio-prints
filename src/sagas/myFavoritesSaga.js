import isEmpty                from 'lodash/isEmpty';
import keys                   from 'lodash/keys';
import pickBy                 from 'lodash/pickBy';
import sortBy                 from 'lodash/sortBy';
import {END, eventChannel}    from 'redux-saga';
import {all, call, put, take} from 'redux-saga/effects';

import {RECEIVED_MY_FAVORITES_SUMMARIES, RECEIVED_MY_FAVORITES_KEYS} from '../actions/actionTypes';

import {app} from '../base';

const myFavoritesData = userId =>
	eventChannel((emit) =>
	{
		const myFavoritesRef = app.database().ref(`/users/${userId}/favorites`);
		const onValueChange  = (dataSnapshot) =>
		{
			const myFavorites = dataSnapshot.val();
			emit({myFavorites, myFavoritesRef});
		};

		myFavoritesRef.on('value', onValueChange, () => emit(END));

		return () =>
		{
			myFavoritesRef.off('value', onValueChange);
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

				const calls                     = keys(myFavoritesKeys)
					.map(key => `/blueprintSummaries/${key}`)
					.map(url => app.database().ref(url))
					.map(ref => call(() => ref.once('value')));
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
