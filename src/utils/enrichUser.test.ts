import { describe, expect, it } from 'vitest';
import { enrichUser } from './enrichUser';
import type { RawUser } from '../schemas';

describe('enrichUser', () =>
{
	it('should enrich user data with counts', () =>
	{
		const rawUser: RawUser = {
			id         : 'user123',
			displayName: 'John Doe',
			email      : 'john@example.com',
			favorites  : {
				'blueprint-1': true,
				'blueprint-2': false,
				'blueprint-3': true,
			},
			blueprints: {
				'blueprint-4': true,
				'blueprint-5': true,
				'blueprint-6': false,
			},
		};

		const result = enrichUser(rawUser);

		expect(result).toEqual({
			id         : 'user123',
			displayName: 'John Doe',
			email      : 'john@example.com',
			favorites  : {
				'blueprint-1': true,
				'blueprint-2': false,
				'blueprint-3': true,
			},
			blueprints: {
				'blueprint-4': true,
				'blueprint-5': true,
				'blueprint-6': false,
			},
			favoritesCount : 2, // Only true values
			blueprintsCount: 2, // Only true values
		});
	});

	it('should handle null input', () =>
	{
		expect(enrichUser(null)).toBeNull();
	});

	it('should handle user with minimal data', () =>
	{
		const rawUser: RawUser = {
			id        : 'user123',
			favorites : {},
			blueprints: {},
		};

		const result = enrichUser(rawUser);

		expect(result).toEqual({
			id             : 'user123',
			favorites      : {},
			blueprints     : {},
			favoritesCount : 0,
			blueprintsCount: 0,
		});
	});

	it('should handle user with empty favorites and blueprints', () =>
	{
		const rawUser: RawUser = {
			id        : 'user123',
			favorites : {},
			blueprints: {},
		};

		const result = enrichUser(rawUser);

		expect(result).toEqual({
			id             : 'user123',
			favorites      : {},
			blueprints     : {},
			favoritesCount : 0,
			blueprintsCount: 0,
		});
	});

	it('should count only true values in favorites and blueprints', () =>
	{
		const rawUser: RawUser = {
			id       : 'user123',
			favorites: {
				'blueprint-1': true,
				'blueprint-2': false,
				'blueprint-3': true,
				'blueprint-4': false,
				'blueprint-5': true,
			},
			blueprints: {
				'blueprint-a': false,
				'blueprint-b': true,
				'blueprint-c': false,
			},
		};

		const result = enrichUser(rawUser);

		expect(result?.favoritesCount).toBe(3); // blueprint-1, blueprint-3, blueprint-5
		expect(result?.blueprintsCount).toBe(1); // blueprint-b
	});
});
