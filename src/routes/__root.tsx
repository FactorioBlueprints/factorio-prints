import {createRootRoute, Outlet} from '@tanstack/react-router';
import {getAuth} from 'firebase/auth';
import {ref, runTransaction} from 'firebase/database';
import React, {useEffect} from 'react';
import {useAuthState} from 'react-firebase-hooks/auth';
import {app} from '../base';
import {getFirebaseDatabase} from '../utils/firebaseDatabase';
import ErrorBoundary from '../components/ErrorBoundary';
import GoogleOfferwall from '../components/GoogleOfferwall';
import Header from '../components/Header';
import {useSentryUser} from '../hooks/useSentryUser';

export const Route = createRootRoute({
	component: Root,
});

function Root() {
	const [user] = useAuthState(getAuth(app));

	useSentryUser(user);

	useEffect(() => {
		if (user) {
			const {uid, email, photoURL, emailVerified, providerData} = user;

			const providerId = providerData && providerData.length && providerData[0].providerId;
			const providerDisplayName = providerId ? providerData[0].displayName : undefined;

			const buildUserInformation = (existingUser: any) => {
				// Firebase transactions pass null when no data exists
				if (existingUser === null) {
					return {
						displayName: providerDisplayName,
						providerDisplayName,
						photoURL,
						email,
						emailVerified,
						providerId,
					};
				}

				const displayName = existingUser.displayName || providerDisplayName;
				return {
					...existingUser,
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
		<>
			<title>Factorio Prints</title>
			<ErrorBoundary>
				<div>
					<Header />
					<GoogleOfferwall />
					<Outlet />
				</div>
			</ErrorBoundary>
		</>
	);
}
