import Rebase from 're-base';
import firebase from 'firebase/app';
import 'firebase/database';
import 'firebase/storage';

export const app = firebase.initializeApp({
	apiKey           : 'AIzaSyAcZJ7hGfxYKhkGHJwAnsLS3z5Tg9kWw2s',
	authDomain       : 'facorio-blueprints.firebaseapp.com',
	databaseURL      : 'https://facorio-blueprints.firebaseio.com',
	storageBucket    : 'facorio-blueprints.appspot.com',
	messagingSenderId: '329845993350',
});
const base = Rebase.createClass(app.database());
export default base;
