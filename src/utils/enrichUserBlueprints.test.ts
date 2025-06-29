import { describe, expect, it } from 'vitest';
import { enrichUserBlueprints } from './enrichUserBlueprints';

describe('enrichUserBlueprints', () =>
{
	it('should enrich user blueprints data with count', () =>
	{
		const rawUserBlueprints = {
			'blueprint-1': true,
			'blueprint-2': false,
			'blueprint-3': true,
			'blueprint-4': true,
		};

		const result = enrichUserBlueprints(rawUserBlueprints);

		expect(result).toEqual({
			blueprintIds: {
				'blueprint-1': true,
				'blueprint-2': false,
				'blueprint-3': true,
				'blueprint-4': true,
			},
			count: 3, // Only true values
		});
	});

	it('should handle null input', () =>
	{
		const result = enrichUserBlueprints(null);

		expect(result).toEqual({
			blueprintIds: {},
			count       : 0,
		});
	});

	it('should handle empty blueprints object', () =>
	{
		const rawUserBlueprints = {};

		const result = enrichUserBlueprints(rawUserBlueprints);

		expect(result).toEqual({
			blueprintIds: {},
			count       : 0,
		});
	});

	it('should count only true values', () =>
	{
		const rawUserBlueprints = {
			'blueprint-1': true,
			'blueprint-2': false,
			'blueprint-3': false,
			'blueprint-4': true,
			'blueprint-5': false,
			'blueprint-6': true,
		};

		const result = enrichUserBlueprints(rawUserBlueprints);

		expect(result?.count).toBe(3); // blueprint-1, blueprint-4, blueprint-6
		expect(result?.blueprintIds).toEqual(rawUserBlueprints);
	});

	it('should handle all false values', () =>
	{
		const rawUserBlueprints = {
			'blueprint-1': false,
			'blueprint-2': false,
			'blueprint-3': false,
		};

		const result = enrichUserBlueprints(rawUserBlueprints);

		expect(result).toEqual({
			blueprintIds: {
				'blueprint-1': false,
				'blueprint-2': false,
				'blueprint-3': false,
			},
			count: 0,
		});
	});

	it('should handle real-world blueprint IDs', () =>
	{
		const rawUserBlueprints = {
			'-KnQ865j-qQ21WoUPbd3': true,
			'-L_jADWYOzVoz7tNRFf0': true,
			'-MhFKv_xHyTpGxP5ABCD': false,
		};

		const result = enrichUserBlueprints(rawUserBlueprints);

		expect(result).toEqual({
			blueprintIds: {
				'-KnQ865j-qQ21WoUPbd3': true,
				'-L_jADWYOzVoz7tNRFf0': true,
				'-MhFKv_xHyTpGxP5ABCD': false,
			},
			count: 2,
		});
	});
});
