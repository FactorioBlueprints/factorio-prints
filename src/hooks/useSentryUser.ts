import {getCurrentScope, getIsolationScope} from '@sentry/react';
import {User} from 'firebase/auth';
import {useEffect} from 'react';

export const useSentryUser = (user: User | null | undefined) => {
	useEffect(() => {
		if (user) {
			const sentryUser = {
				id: user.uid,
				email: user.email || undefined,
				username: user.displayName || undefined,
			};

			getIsolationScope().setUser(sentryUser);
			getCurrentScope().setUser(sentryUser);
		} else {
			getIsolationScope().setUser(null);
			getCurrentScope().setUser(null);
		}
	}, [user]);
};
