import {act, fireEvent, render, renderHook, screen} from '@testing-library/react';
import {FirebaseError} from 'firebase/app';
import {beforeEach, describe, expect, it, vi} from 'vite-plus/test';
import {getProviderAuthenticationErrorMessage, useAuthProviders} from '../../hooks/useAuthProviders';
import {AuthenticationForm} from './AuthenticationForm';

const authenticationMocks = vi.hoisted(() => ({
	auth: {},
	captureException: vi.fn(),
	signInWithPopup: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
	captureException: authenticationMocks.captureException,
}));

vi.mock('firebase/auth', async (importOriginal) => {
	const original = await importOriginal<typeof import('firebase/auth')>();
	return {
		...original,
		getAuth: vi.fn(() => authenticationMocks.auth),
		signInWithPopup: authenticationMocks.signInWithPopup,
	};
});

describe('AuthenticationForm', () => {
	beforeEach(() => {
		authenticationMocks.captureException.mockReset();
		authenticationMocks.signInWithPopup.mockReset();
	});

	it('maps provider failures to actionable messages', () => {
		expect([
			getProviderAuthenticationErrorMessage(
				new FirebaseError('auth/account-exists-with-different-credential', 'Account conflict'),
			),
			getProviderAuthenticationErrorMessage(new FirebaseError('auth/network-request-failed', 'Network failure')),
			getProviderAuthenticationErrorMessage(new FirebaseError('auth/operation-not-allowed', 'Provider disabled')),
			getProviderAuthenticationErrorMessage(new FirebaseError('auth/popup-blocked', 'Popup blocked')),
			getProviderAuthenticationErrorMessage(new FirebaseError('auth/unauthorized-domain', 'Unauthorized domain')),
			getProviderAuthenticationErrorMessage(new FirebaseError('auth/internal-error', 'Unexpected failure')),
			getProviderAuthenticationErrorMessage(new Error('Non-Firebase failure')),
		]).toStrictEqual([
			'An account already exists with this email address.',
			'Unable to reach the authentication service. Check your connection and try again.',
			'This sign-in method is currently unavailable.',
			'The sign-in popup was blocked. Allow popups for this site and try again.',
			'Sign-in is not configured for this domain.',
			'Unable to sign in. Please try again.',
			'Unable to sign in. Please try again.',
		]);
	});

	it('shows and reports provider authentication failures', async () => {
		const authenticationError = new FirebaseError('auth/popup-blocked', 'Popup blocked');
		const onAuthSuccess = vi.fn();
		authenticationMocks.signInWithPopup.mockRejectedValue(authenticationError);
		render(<AuthenticationForm onAuthSuccess={onAuthSuccess} />);

		fireEvent.click(screen.getByRole('button', {name: /Log in with Google$/}));

		const alert = await screen.findByRole('alert');
		expect({
			alertText: alert.textContent,
			captureExceptionCalls: authenticationMocks.captureException.mock.calls,
			onAuthSuccessCalls: onAuthSuccess.mock.calls,
		}).toStrictEqual({
			alertText: 'The sign-in popup was blocked. Allow popups for this site and try again.',
			captureExceptionCalls: [
				[
					authenticationError,
					{
						tags: {
							component: 'authentication',
							operation: 'provider-sign-in',
						},
						extra: {authenticationErrorCode: 'auth/popup-blocked'},
					},
				],
			],
			onAuthSuccessCalls: [],
		});
	});

	it('keeps user-cancelled popups silent', async () => {
		authenticationMocks.signInWithPopup.mockRejectedValue(
			new FirebaseError('auth/popup-closed-by-user', 'Popup closed'),
		);
		const {result} = renderHook(() => useAuthProviders());

		await act(() => result.current.authenticateWithProvider(result.current.googleProvider));

		expect({
			authenticationError: result.current.authenticationError,
			captureExceptionCalls: authenticationMocks.captureException.mock.calls,
		}).toStrictEqual({
			authenticationError: undefined,
			captureExceptionCalls: [],
		});
	});

	it('calls the success handler after provider authentication', async () => {
		const onAuthSuccess = vi.fn();
		authenticationMocks.signInWithPopup.mockResolvedValue({});
		const {result} = renderHook(() => useAuthProviders(onAuthSuccess));

		await act(() => result.current.authenticateWithProvider(result.current.githubProvider));

		expect({
			authenticationError: result.current.authenticationError,
			onAuthSuccessCalls: onAuthSuccess.mock.calls,
		}).toStrictEqual({
			authenticationError: undefined,
			onAuthSuccessCalls: [[]],
		});
	});
});
