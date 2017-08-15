import {call, put, take} from 'redux-saga/effects';
import {eventChannel, END} from 'redux-saga';
import isEmpty from 'lodash/isEmpty';
import {app} from '../base';

import {SUBSCRIBED_TO_MY_FAVORITES, RECEIVED_MY_FAVORITES} from '../actions/actionTypes';

const myFavoritesData = uid =>
	eventChannel((emit) =>
	{
		const myFavoritesRef = app.database().ref(`/users/${uid}/favorites`);
		const onValueChange = (dataSnapshot) =>
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

const authSaga = function*({user})
{
	if (!isEmpty(user))
	{
		const {uid} = user;
		const channel = yield call(myFavoritesData, uid);
		yield put({type: SUBSCRIBED_TO_MY_FAVORITES, uid});
		try
		{
			while (true)
			{
				const {myFavorites, myFavoritesRef} = yield take(channel);
				yield put({type: RECEIVED_MY_FAVORITES, myFavorites, myFavoritesRef});
			}
		}
		finally
		{
			console.log('Unsubscribed from blueprintSummaries');
		}
	}
}

export default authSaga;
