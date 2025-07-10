import {describe, expect, it} from 'vitest';
import {enrichUserFavorites} from './enrichUserFavorites';

describe('enrichUserFavorites', () => {
	it('should enrich user favorites data with count', () => {
		const rawUserFavorites = {
			'blueprint-1': true,
			'blueprint-2': false,
			'blueprint-3': true,
			'blueprint-4': true,
		};

		const result = enrichUserFavorites(rawUserFavorites);

		expect(result).toEqual({
			favoriteIds: {
				'blueprint-1': true,
				'blueprint-2': false,
				'blueprint-3': true,
				'blueprint-4': true,
			},
			count: 3, // Only true values
		});
	});

	it('should handle null input', () => {
		const result = enrichUserFavorites(null);

		expect(result).toEqual({
			favoriteIds: {},
			count: 0,
		});
	});

	it('should handle empty favorites object', () => {
		const rawUserFavorites = {};

		const result = enrichUserFavorites(rawUserFavorites);

		expect(result).toEqual({
			favoriteIds: {},
			count: 0,
		});
	});

	it('should count only true values', () => {
		const rawUserFavorites = {
			'blueprint-1': true,
			'blueprint-2': false,
			'blueprint-3': false,
			'blueprint-4': true,
			'blueprint-5': false,
			'blueprint-6': true,
		};

		const result = enrichUserFavorites(rawUserFavorites);

		expect(result?.count).toBe(3); // blueprint-1, blueprint-4, blueprint-6
		expect(result?.favoriteIds).toEqual(rawUserFavorites);
	});

	it('should handle all false values', () => {
		const rawUserFavorites = {
			'blueprint-1': false,
			'blueprint-2': false,
			'blueprint-3': false,
		};

		const result = enrichUserFavorites(rawUserFavorites);

		expect(result).toEqual({
			favoriteIds: {
				'blueprint-1': false,
				'blueprint-2': false,
				'blueprint-3': false,
			},
			count: 0,
		});
	});

	it('should handle real-world blueprint IDs', () => {
		const rawUserFavorites = {
			'-KnQ865j-qQ21WoUPbd3': true,
			'-L_jADWYOzVoz7tNRFf0': false,
			'-MhFKv_xHyTpGxP5ABCD': true,
			'-NjKLm_nOpQrStUvWxYZ': false,
		};

		const result = enrichUserFavorites(rawUserFavorites);

		expect(result).toEqual({
			favoriteIds: {
				'-KnQ865j-qQ21WoUPbd3': true,
				'-L_jADWYOzVoz7tNRFf0': false,
				'-MhFKv_xHyTpGxP5ABCD': true,
				'-NjKLm_nOpQrStUvWxYZ': false,
			},
			count: 2,
		});
	});
});
