import React from 'react';
import { Outlet } from '@tanstack/react-router';
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

			const buildUserInformation = (existingUser: any) =>
			{
				// Firebase transactions pass null when no data exists
				if (existingUser === null)
				{
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

			const userRef = ref(getDatabase(app), `/users/${uid}/`);
			runTransaction(userRef, buildUserInformation);
		}
	}, [user]);

	return (
		<>
			<title>Factorio Prints</title>
			<ErrorBoundary>
				<div>
					<Header />
					<Outlet />
				</div>
			</ErrorBoundary>
		</>
	);
}
