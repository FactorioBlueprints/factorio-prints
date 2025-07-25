import {createFileRoute, useNavigate} from '@tanstack/react-router';
import {getAuth, isSignInWithEmailLink, signInWithEmailLink} from 'firebase/auth';
import React, {useEffect, useState} from 'react';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';

import {app} from '../base';
import PageHeader from '../components/PageHeader';

export const Route = createFileRoute('/auth/email-callback')({
	component: EmailCallback,
});

function EmailCallback() {
	const navigate = useNavigate();
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
	const [errorMessage, setErrorMessage] = useState<string>('');

	useEffect(() => {
		const handleEmailSignIn = async () => {
			const auth = getAuth(app);
			const currentUrl = window.location.href;

			if (isSignInWithEmailLink(auth, currentUrl)) {
				let email = localStorage.getItem('emailForSignIn');

				if (!email) {
					email = window.prompt('Please provide your email for confirmation');
				}

				if (!email) {
					setStatus('error');
					setErrorMessage('Email address is required to complete sign-in.');
					return;
				}

				try {
					await signInWithEmailLink(auth, email, currentUrl);
					localStorage.removeItem('emailForSignIn');
					setStatus('success');

					setTimeout(() => {
						navigate({to: '/'});
					}, 2000);
				} catch (error) {
					console.error('Error signing in with email link:', error);
					setStatus('error');
					setErrorMessage('Failed to sign in. The link may be invalid or expired.');
				}
			} else {
				setStatus('error');
				setErrorMessage('Invalid sign-in link.');
			}
		};

		handleEmailSignIn();
	}, [navigate]);

	if (status === 'loading') {
		return (
			<Container className="text-center py-5">
				<PageHeader title="Signing you in..." />
				<Spinner animation="border" />
				<p className="mt-3">Please wait while we complete your sign-in...</p>
			</Container>
		);
	}

	if (status === 'success') {
		return (
			<Container className="text-center py-5">
				<PageHeader title="Sign-in successful!" />
				<p className="lead text-success">You have been successfully signed in. Redirecting...</p>
			</Container>
		);
	}

	return (
		<Container className="text-center py-5">
			<PageHeader title="Sign-in failed" />
			<p className="lead text-danger">{errorMessage}</p>
			<p>
				<a
					href="/"
					className="btn btn-primary"
				>
					Return to Home
				</a>
			</p>
		</Container>
	);
}
