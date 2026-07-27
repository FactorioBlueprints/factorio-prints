import {describe, expect, it} from 'vitest';
import {isUnactionableError} from './sentryFiltering';

describe('Sentry error filtering', () => {
	it('filters expected Firebase user transaction disconnect warnings', () => {
		const messages = [
			'[2026-07-27T18:07:41.068Z] @firebase/database: FIREBASE WARNING: transaction at /users/user-123 failed: disconnect',
			'@firebase/database: FIREBASE WARNING: transaction at /blueprints/blueprint-123 failed: disconnect',
			'@firebase/database: FIREBASE WARNING: transaction at /users/user-123 failed: permission_denied',
		];

		expect(messages.map(isUnactionableError)).toStrictEqual([true, false, false]);
	});
});
