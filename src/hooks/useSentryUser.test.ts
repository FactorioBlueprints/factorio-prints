import * as Sentry from '@sentry/react';
import {User} from 'firebase/auth';
import {renderHook} from '@testing-library/react';
import {vi, describe, it, expect, beforeEach} from 'vitest';
import {useSentryUser} from './useSentryUser';

const mockIsolationScope = {
	setUser: vi.fn(),
};

const mockCurrentScope = {
	setUser: vi.fn(),
	getUser: vi.fn(),
};

vi.mock('@sentry/react', () => ({
	setUser: vi.fn(),
	getIsolationScope: vi.fn(() => mockIsolationScope),
	getCurrentScope: vi.fn(() => mockCurrentScope),
}));

describe('useSentryUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sets Sentry user context when user is authenticated', async () => {
		const mockUser = {
			uid: 'test-user-123',
			email: 'test@example.com',
			displayName: 'Test User',
		} as User;

		renderHook(() => useSentryUser(mockUser));

		const expectedUser = {
			id: 'test-user-123',
			email: 'test@example.com',
			username: 'Test User',
		};

		expect(mockIsolationScope.setUser).toHaveBeenCalledWith(expectedUser);
		expect(mockCurrentScope.setUser).toHaveBeenCalledWith(expectedUser);
	});

	it('clears Sentry user context when user is null', () => {
		renderHook(() => useSentryUser(null));

		expect(mockIsolationScope.setUser).toHaveBeenCalledWith(null);
		expect(mockCurrentScope.setUser).toHaveBeenCalledWith(null);
	});

	it('handles user without email', () => {
		const mockUser = {
			uid: 'test-user-456',
			email: null,
			displayName: 'Anonymous User',
		} as User;

		renderHook(() => useSentryUser(mockUser));

		const expectedUser = {
			id: 'test-user-456',
			email: undefined,
			username: 'Anonymous User',
		};

		expect(mockIsolationScope.setUser).toHaveBeenCalledWith(expectedUser);
		expect(mockCurrentScope.setUser).toHaveBeenCalledWith(expectedUser);
	});

	it('handles user without display name', () => {
		const mockUser = {
			uid: 'test-user-789',
			email: 'test@example.com',
			displayName: null,
		} as User;

		renderHook(() => useSentryUser(mockUser));

		const expectedUser = {
			id: 'test-user-789',
			email: 'test@example.com',
			username: undefined,
		};

		expect(mockIsolationScope.setUser).toHaveBeenCalledWith(expectedUser);
		expect(mockCurrentScope.setUser).toHaveBeenCalledWith(expectedUser);
	});

	it('updates context when user changes', () => {
		const firstUser = {
			uid: 'user-1',
			email: 'user1@example.com',
			displayName: 'User One',
		} as User;

		const secondUser = {
			uid: 'user-2',
			email: 'user2@example.com',
			displayName: 'User Two',
		} as User;

		const {rerender} = renderHook(({user}) => useSentryUser(user), {initialProps: {user: firstUser}});

		const expectedFirstUser = {
			id: 'user-1',
			email: 'user1@example.com',
			username: 'User One',
		};

		expect(mockIsolationScope.setUser).toHaveBeenCalledWith(expectedFirstUser);
		expect(mockCurrentScope.setUser).toHaveBeenCalledWith(expectedFirstUser);

		// Clear mocks before rerender
		vi.clearAllMocks();

		rerender({user: secondUser});

		const expectedSecondUser = {
			id: 'user-2',
			email: 'user2@example.com',
			username: 'User Two',
		};

		expect(mockIsolationScope.setUser).toHaveBeenCalledWith(expectedSecondUser);
		expect(mockCurrentScope.setUser).toHaveBeenCalledWith(expectedSecondUser);
	});
});
