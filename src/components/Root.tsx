import {Outlet} from '@tanstack/react-router';
import {getAuth, User} from 'firebase/auth';
import {ref, runTransaction} from 'firebase/database';
import type React from 'react';
import {useEffect} from 'react';
import {useAuthState} from 'react-firebase-hooks/auth';

import {app} from '../base';
import {getFirebaseDatabase} from '../utils/firebaseDatabase';
import ErrorBoundary from './ErrorBoundary';
import Header from './Header';

interface UserData {
	displayName?: string | null;
	providerDisplayName?: string | null;
	photoURL?: string | null;
	email?: string | null;
	emailVerified?: boolean;
	providerId?: string | null;
}

const Root: React.FC = () => {
	const [user] = useAuthState(getAuth(app));

	// Update user profile in the database when auth state changes
	useEffect(() => {
		if (user) {
			const {uid, email, photoURL, emailVerified, providerData} = user;

			const providerId = providerData && providerData.length > 0 ? providerData[0].providerId : null;
			const providerDisplayName = providerId && providerData ? providerData[0].displayName : undefined;

			const buildUserInformation = (existingUser: UserData | null): UserData => {
				const existingUserInitialized = existingUser || {};
				const displayName = existingUserInitialized.displayName || providerDisplayName;
				return {
					...existingUserInitialized,
					displayName,
					providerDisplayName,
					photoURL,
					email,
					emailVerified,
					providerId,
				};
			};

			try {
				const userRef = ref(getFirebaseDatabase(), `/users/${uid}/`);
				runTransaction(userRef, buildUserInformation).catch((error) => {
					// Silently ignore transaction errors - user data will be updated on next sign-in
					console.log('User data update skipped:', error?.message || 'Transaction failed');
				});
			} catch (error) {
				// Database initialization failed - likely due to network issues or browser privacy settings
				console.log('Database connection skipped:', error instanceof Error ? error.message : 'Unknown error');
			}
		}
	}, [user]);

	return (
		<ErrorBoundary>
			<title>Factorio Prints</title>
			<div>
				<Header />
				<Outlet />
			</div>
		</ErrorBoundary>
	);
};

export default Root;
