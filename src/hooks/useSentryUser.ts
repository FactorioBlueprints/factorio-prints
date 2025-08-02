import * as Sentry from '@sentry/react';
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

			Sentry.getIsolationScope().setUser(sentryUser);
			Sentry.getCurrentScope().setUser(sentryUser);
		} else {
			Sentry.getIsolationScope().setUser(null);
			Sentry.getCurrentScope().setUser(null);
		}
	}, [user]);
};
