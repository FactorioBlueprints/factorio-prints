import {type FirebaseApp, initializeApp} from 'firebase/app';

const firebaseConfig = {
	apiKey: 'AIzaSyAcZJ7hGfxYKhkGHJwAnsLS3z5Tg9kWw2s',
	authDomain: 'facorio-blueprints.firebaseapp.com',
	databaseURL: 'https://facorio-blueprints.firebaseio.com',
	storageBucket: 'facorio-blueprints.appspot.com',
	messagingSenderId: '329845993350',
};

export const app: FirebaseApp = initializeApp(firebaseConfig);

// Google Offerwall configuration
export const offerwallConfig = {
	enabled: true,
	// Test mode - shows offerwall immediately on protected routes
	testMode: false,
	// Access duration in hours (how long access is granted after viewing ad)
	accessDurationHours: 24,
	// Pages that require offerwall access
	protectedRoutes: ['/view'],
	// Custom messaging
	messages: {
		accessPrompt: 'Watch a short ad to view this blueprint',
		accessGranted: 'Thank you! You now have access to view blueprints.',
		accessDenied: 'Access denied. Please watch the ad to view blueprints.',
	},
};
