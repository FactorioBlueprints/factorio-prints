import {initializeApp} from 'firebase/app';
import {getDatabase} from 'firebase/database';
import {getStorage} from 'firebase/storage';
import {getAuth} from 'firebase/auth';

const firebaseConfig = {
	apiKey           : 'AIzaSyAcZJ7hGfxYKhkGHJwAnsLS3z5Tg9kWw2s',
	authDomain       : 'facorio-blueprints.firebaseapp.com',
	databaseURL      : 'https://facorio-blueprints.firebaseio.com',
	storageBucket    : 'facorio-blueprints.appspot.com',
	messagingSenderId: '329845993350',
};

export const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default {
	app,
	database,
	storage,
	auth,
};
