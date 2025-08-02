// Suppress the Google authentication deprecation warning
// This warning comes from Firebase Auth's internal use of Google's deprecated auth libraries
//
// Background:
// - Firebase issue #7012 was about Firestore's use of gapi.auth (closed April 2023)
// - The warning we're seeing is from Firebase Auth's continued use of gapi for popup/redirect flows
// - No open issue currently tracks this specific warning
// - The warning is cosmetic and doesn't affect functionality
//
// Related issues:
// - https://github.com/firebase/firebase-js-sdk/issues/7012 (Firestore gapi usage - closed)
// - https://github.com/firebase/firebase-js-sdk/issues/7407 (iOS gapi.iframes errors - open)
export function suppressGoogleAuthDeprecationWarning(): void {
	const originalWarn = console.warn;
	console.warn = (...args) => {
		const warningMessage = args[0]?.toString() || '';
		// Suppress the specific Google auth deprecation warning
		if (warningMessage.includes('Your client application uses libraries for user authentication')) {
			return;
		}
		// Pass through all other warnings
		originalWarn.apply(console, args);
	};
}
