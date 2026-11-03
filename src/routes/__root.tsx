import {createRootRoute, Outlet, useRouter} from "@tanstack/react-router";
import {getAuth} from "firebase/auth";
import {ref, runTransaction} from "firebase/database";
import React, {useEffect} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {useAuthState} from "react-firebase-hooks/auth";
import {app} from "../base";
import {getFirebaseDatabase} from "../utils/firebaseDatabase";
import DisplayNamePrompt from "../components/DisplayNamePrompt";
import ErrorBoundary from "../components/ErrorBoundary";
import Header from "../components/Header";
import {useSentryUser} from "../hooks/useSentryUser";
import {userNeedsDisplayNameQueryKey} from "../hooks/useUser";
import {buildUserInformation, type UserRecord} from "../utils/defaultDisplayName";

function NotFoundComponent()
{
	const router = useRouter();
	const pathname = router.state.location.pathname;

	return (
		<div className="p-5 rounded-lg jumbotron">
			<title>Factorio Prints: 404</title>
			<h1 className="display-4">404</h1>
			<p className="lead">This is not the webpage you are looking for.</p>
			<p>Path: {pathname}</p>
		</div>
	);
}

export const Route = createRootRoute(
	{
		component: Root,
		notFoundComponent: NotFoundComponent,
	},
);

function Root()
{
	const [user] = useAuthState(getAuth(app));
	const queryClient = useQueryClient();

	useSentryUser(user);

	useEffect(() =>
	{
		if (user)
		{
			const {uid, email, photoURL, emailVerified, providerData} = user;

			const providerId = providerData?.[0]?.providerId ?? null;
			// Kept private (owner/moderator only); never used as the public display name
			const providerDisplayName = providerId ? providerData[0].displayName : undefined;
			const profile =
			{
				providerDisplayName,
				photoURL,
				email,
				emailVerified,
				providerId,
			};

			try
			{
				const userRef = ref(getFirebaseDatabase(), `/users/${uid}/`);
				runTransaction(userRef, (existingUser: UserRecord | null) =>
					buildUserInformation(existingUser, profile),
				)
					.then(({committed, snapshot}) =>
					{
						if (committed)
						{
							queryClient.setQueryData(
								userNeedsDisplayNameQueryKey(uid),
								snapshot.child("needsDisplayName").val() === true,
							);
						}
					})
					.catch((error) =>
					{
						// Silently ignore transaction errors - user data will be updated on next sign-in
						console.log("User data update skipped:", error?.message || "Transaction failed");
					});
			}
			catch (error)
			{
				// Database initialization failed - likely due to network issues or browser privacy settings
				console.log("Database connection skipped:", error instanceof Error ? error.message : "Unknown error");
			}
		}
	}, [user, queryClient]);

	return (
		<>
			<title>Factorio Prints</title>
			<ErrorBoundary>
				<div>
					<Header />
					<DisplayNamePrompt />
					<Outlet />
				</div>
			</ErrorBoundary>
		</>
	);
}
