import {
	type AuthProvider,
	GithubAuthProvider,
	GoogleAuthProvider,
	getAuth,
	sendSignInLinkToEmail,
	signInWithPopup,
} from 'firebase/auth';
import {useCallback, useMemo, useState} from 'react';
import {app} from '../base';

export interface UseAuthProvidersReturn {
	googleProvider: GoogleAuthProvider;
	githubProvider: GithubAuthProvider;
	authenticateWithProvider: (provider: AuthProvider) => Promise<void>;
	authenticateWithEmail: (email: string) => Promise<void>;
	isEmailSending: boolean;
}

export const useAuthProviders = (onAuthSuccess?: () => void): UseAuthProvidersReturn => {
	const [isEmailSending, setIsEmailSending] = useState(false);

	const googleProvider = useMemo(() => {
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters({prompt: 'consent select_account'});
		return provider;
	}, []);

	const githubProvider = useMemo(() => {
		const provider = new GithubAuthProvider();
		provider.setCustomParameters({allow_signup: 'true'});
		return provider;
	}, []);

	const authenticateWithProvider = useCallback(
		async (provider: AuthProvider) => {
			try {
				await signInWithPopup(getAuth(app), provider);
				onAuthSuccess?.();
			} catch (error: any) {
				if (error.code !== 'auth/popup-closed-by-user') {
					console.error({error});
				}
			}
		},
		[onAuthSuccess],
	);

	const authenticateWithEmail = useCallback(
		async (emailAddress: string) => {
			if (!emailAddress.trim()) {
				return;
			}

			setIsEmailSending(true);

			const actionCodeSettings = {
				url: `${window.location.origin}/auth/email-callback`,
				handleCodeInApp: true,
			};

			try {
				await sendSignInLinkToEmail(getAuth(app), emailAddress, actionCodeSettings);
				localStorage.setItem('emailForSignIn', emailAddress);
				alert('Check your email for a sign-in link!');
				onAuthSuccess?.();
			} catch (error) {
				console.error('Error sending email:', error);
				alert('Failed to send sign-in email. Please try again.');
			} finally {
				setIsEmailSending(false);
			}
		},
		[onAuthSuccess],
	);

	return {
		googleProvider,
		githubProvider,
		authenticateWithProvider,
		authenticateWithEmail,
		isEmailSending,
	};
};
