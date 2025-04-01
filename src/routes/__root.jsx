import React from 'react';
import { Outlet } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, runTransaction } from 'firebase/database';
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import ErrorBoundary from '../components/ErrorBoundary';
import Header from '../components/Header';
import { app } from '../base';
import { createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
	component: Root,
});

function Root()
{
	const [user] = useAuthState(getAuth(app));

	// Update user profile in the database when auth state changes
	useEffect(() =>
	{
		if (user)
		{
			const { uid, email, photoURL, emailVerified, providerData } = user;

			const providerId = providerData && providerData.length && providerData[0].providerId;
			const providerDisplayName = providerId ? providerData[0].displayName : undefined;

			const buildUserInformation = (existingUser) =>
			{
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

			const userRef = ref(getDatabase(app), `/users/${uid}/`);
			runTransaction(userRef, buildUserInformation);
		}
	}, [user]);

	return (
		<>
			<Helmet>
				<title>Factorio Prints</title>
			</Helmet>
			<ErrorBoundary>
				<div>
					<Header />
					<Outlet />
				</div>
			</ErrorBoundary>
		</>
	);
}
