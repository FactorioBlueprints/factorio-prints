import { initializeApp, type FirebaseApp } from 'firebase/app';

const firebaseConfig = {
	apiKey           : 'AIzaSyAcZJ7hGfxYKhkGHJwAnsLS3z5Tg9kWw2s',
	authDomain       : 'facorio-blueprints.firebaseapp.com',
	databaseURL      : 'https://facorio-blueprints.firebaseio.com',
	storageBucket    : 'facorio-blueprints.appspot.com',
	messagingSenderId: '329845993350',
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
