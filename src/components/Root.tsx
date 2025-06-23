import { getAuth, User } from 'firebase/auth';
import { getDatabase, ref, runTransaction } from 'firebase/database';
import React, { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Helmet } from 'react-helmet-async';
import { Outlet } from '@tanstack/react-router';

import { app } from '../base';
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

const Root: React.FC = () =>
{
	const [user] = useAuthState(getAuth(app));

	// Update user profile in the database when auth state changes
	useEffect(() =>
	{
		if (user)
		{
			const { uid, email, photoURL, emailVerified, providerData } = user;

			const providerId = providerData && providerData.length > 0 ? providerData[0].providerId : null;
			const providerDisplayName = providerId && providerData ? providerData[0].displayName : undefined;

			const buildUserInformation = (existingUser: UserData | null): UserData =>
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
};

export default Root;
