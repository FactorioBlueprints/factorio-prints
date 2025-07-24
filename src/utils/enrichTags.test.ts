import {describe, expect, it, vi} from 'vitest';
import type {RawTags} from '../schemas';
import enrichTags from './enrichTags';

describe('enrichTags', () => {
	describe('tagNameToLabel conversion', () => {
		it('should convert simple tag names to labels', () => {
			const rawTags: RawTags = {
				belt: ['balancer', 'bus', 'loader'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].label).toBe('Balancer');
			expect(enriched[1].label).toBe('Bus');
			expect(enriched[2].label).toBe('Loader');
		});

		it('should handle multi-word tags with spaces', () => {
			const rawTags: RawTags = {
				production: ['oil processing', 'coal liquification', 'rocket parts'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].label).toBe('Coal Liquification');
			expect(enriched[1].label).toBe('Oil Processing');
			expect(enriched[2].label).toBe('Rocket Parts');
		});

		it('should handle hyphenated tags', () => {
			const rawTags: RawTags = {
				train: ['left-hand-drive', 'multi-station', 'right-hand-drive'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].label).toBe('Left-Hand-Drive');
			expect(enriched[1].label).toBe('Multi-Station');
			expect(enriched[2].label).toBe('Right-Hand-Drive');
		});

		it('should handle parentheses in tag names', () => {
			const rawTags: RawTags = {
				belt: ['express transport belt (blue)', 'fast transport belt (red)', 'transport belt (yellow)'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].label).toBe('Express Transport Belt (Blue)');
			expect(enriched[1].label).toBe('Fast Transport Belt (Red)');
			expect(enriched[2].label).toBe('Transport Belt (Yellow)');
		});

		it('should handle complex combinations', () => {
			const rawTags: RawTags = {
				production: [
					'advanced circuit (red)',
					'electronic circuit (green)',
					'processing unit (blue)',
					'mall (make everything)',
				],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].label).toBe('Advanced Circuit (Red)');
			expect(enriched[1].label).toBe('Electronic Circuit (Green)');
			expect(enriched[2].label).toBe('Mall (make Everything)');
			expect(enriched[3].label).toBe('Processing Unit (Blue)');
		});

		it('should handle special characters in version tags', () => {
			const rawTags: RawTags = {
				version: ['0,14', '0,15'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].label).toBe('0,14');
			expect(enriched[1].label).toBe('0,15');
		});
	});

	describe('enrichTags function', () => {
		it('should return empty array for null input', () => {
			const result = enrichTags(null);
			expect(result).toEqual([]);
		});

		it('should return empty array for empty tags object', () => {
			const result = enrichTags({});
			expect(result).toEqual([]);
		});

		it('should enrich single category with multiple tags', () => {
			const rawTags: RawTags = {
				belt: ['balancer', 'bus', 'loader'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched).toHaveLength(3);
			expect(enriched[0]).toEqual({
				path: '/belt/balancer/',
				category: 'belt',
				name: 'balancer',
				label: 'Balancer',
			});
			expect(enriched[1]).toEqual({
				path: '/belt/bus/',
				category: 'belt',
				name: 'bus',
				label: 'Bus',
			});
			expect(enriched[2]).toEqual({
				path: '/belt/loader/',
				category: 'belt',
				name: 'loader',
				label: 'Loader',
			});
		});

		it('should sort tags by category first, then by name', () => {
			const rawTags: RawTags = {
				production: ['science', 'mining'],
				belt: ['loader', 'balancer'],
				train: ['junction', 'station'],
			};

			const enriched = enrichTags(rawTags);

			// Should be sorted: belt (balancer, loader), production (mining, science), train (junction, station)
			expect(enriched.map((t) => `${t.category}/${t.name}`)).toEqual([
				'belt/balancer',
				'belt/loader',
				'production/mining',
				'production/science',
				'train/junction',
				'train/station',
			]);
		});

		it('should handle real-world tag data', () => {
			const realWorldTags: RawTags = {
				belt: [
					'balancer',
					'bus',
					'express transport belt (blue)',
					'fast transport belt (red)',
					'loader',
					'transport belt (yellow)',
				],
				circuit: ['clock', 'combinator', 'counter', 'display', 'indicator', 'memory cell', 'power switch'],
				general: [
					'beaconized',
					'book',
					'compact',
					'early game',
					'late game (megabase)',
					'mid game',
					'modular',
					'safe',
					'tileable',
					'tricks',
					'upgradeable',
				],
				meta: ['copypasta', 'tutorial'],
				mods: [
					'angels',
					'bobs',
					'creative',
					'expensive',
					'factorissimo',
					'lighted-electric-poles',
					'other',
					'vanilla',
					'warehousing',
				],
				other: ['art', 'defenses', 'storage'],
				power: ['accumulator', 'kovarex enrichment', 'nuclear', 'solar', 'steam'],
				production: [
					'advanced circuit (red)',
					'batteries',
					'belts',
					'circuits',
					'coal liquification',
					'electronic circuit (green)',
					'fluids',
					'guns and ammo',
					'inserters',
					'mall (make everything)',
					'mining',
					'modules',
					'oil processing',
					'plastic',
					'processing unit (blue)',
					'research (labs)',
					'robots',
					'rocket parts',
					'science',
					'smelting',
					'uranium',
				],
				train: [
					'crossing',
					'junction',
					'left-hand-drive',
					'loading station',
					'multi-station',
					'pax',
					'right-hand-drive',
					'roundabout',
					'stacker',
					'unloading station',
				],
				version: ['0,14', '0,15'],
			};

			const enriched = enrichTags(realWorldTags);

			// Check total count
			const expectedTotal = Object.values(realWorldTags).reduce((sum, tags) => sum + tags.length, 0);
			expect(enriched).toHaveLength(expectedTotal);

			// Check specific examples
			const balancer = enriched.find((t) => t.name === 'balancer');
			expect(balancer).toEqual({
				path: '/belt/balancer/',
				category: 'belt',
				name: 'balancer',
				label: 'Balancer',
			});

			const kovarex = enriched.find((t) => t.name === 'kovarex enrichment');
			expect(kovarex).toEqual({
				path: '/power/kovarex enrichment/',
				category: 'power',
				name: 'kovarex enrichment',
				label: 'Kovarex Enrichment',
			});

			const leftHandDrive = enriched.find((t) => t.name === 'left-hand-drive');
			expect(leftHandDrive).toEqual({
				path: '/train/left-hand-drive/',
				category: 'train',
				name: 'left-hand-drive',
				label: 'Left-Hand-Drive',
			});

			const expressBlue = enriched.find((t) => t.name === 'express transport belt (blue)');
			expect(expressBlue).toEqual({
				path: '/belt/express transport belt (blue)/',
				category: 'belt',
				name: 'express transport belt (blue)',
				label: 'Express Transport Belt (Blue)',
			});
		});

		it('should validate raw tags input', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const invalidTags = {
				belt: 'not an array', // Invalid: should be array
			} as any;

			expect(() => enrichTags(invalidTags)).toThrow(/Invalid raw tags/);

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('should validate enriched tags output', () => {
			const rawTags: RawTags = {
				belt: ['balancer'],
			};

			// The enrichTags function validates its output
			const enriched = enrichTags(rawTags);

			// If validation passes, we should get valid enriched tags
			expect(enriched).toHaveLength(1);
			expect(enriched[0]).toMatchObject({
				path: '/belt/balancer/',
				category: 'belt',
				name: 'balancer',
				label: 'Balancer',
			});
		});

		it('should handle categories with no tags', () => {
			const rawTags: RawTags = {
				belt: [],
				train: ['station'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched).toHaveLength(1);
			expect(enriched[0].category).toBe('train');
			expect(enriched[0].name).toBe('station');
		});

		it('should preserve special characters in tag names', () => {
			const rawTags: RawTags = {
				special: ['tag/with/slashes', 'tag_with_underscores', 'tag.with.dots'],
			};

			const enriched = enrichTags(rawTags);

			// Find each tag by name instead of assuming order
			const dotTag = enriched.find((t) => t.name === 'tag.with.dots');
			const slashTag = enriched.find((t) => t.name === 'tag/with/slashes');
			const underscoreTag = enriched.find((t) => t.name === 'tag_with_underscores');

			expect(dotTag).toBeDefined();
			expect(dotTag!.path).toBe('/special/tag.with.dots/');

			expect(slashTag).toBeDefined();
			expect(slashTag!.path).toBe('/special/tag/with/slashes/');

			expect(underscoreTag).toBeDefined();
			expect(underscoreTag!.path).toBe('/special/tag_with_underscores/');
		});

		it('should handle long category and tag names', () => {
			const rawTags: RawTags = {
				'very-long-category-name-that-should-still-work': [
					'extremely-long-tag-name-that-goes-on-and-on-and-on',
				],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].category).toBe('very-long-category-name-that-should-still-work');
			expect(enriched[0].name).toBe('extremely-long-tag-name-that-goes-on-and-on-and-on');
			expect(enriched[0].label).toBe('Extremely-Long-Tag-Name-That-Goes-On-And-On-And-On');
			expect(enriched[0].path).toBe(
				'/very-long-category-name-that-should-still-work/extremely-long-tag-name-that-goes-on-and-on-and-on/',
			);
		});
	});

	describe('edge cases', () => {
		it('should handle undefined input gracefully', () => {
			const result = enrichTags(undefined as any);
			expect(result).toEqual([]);
		});

		it('should handle tag names with only spaces', () => {
			const rawTags: RawTags = {
				test: ['   ', 'normal tag'],
			};

			const enriched = enrichTags(rawTags);

			// Tag with only spaces should still be processed
			expect(enriched[0].name).toBe('   ');
			expect(enriched[0].label).toBe('   '); // Spaces preserved
			expect(enriched[1].name).toBe('normal tag');
			expect(enriched[1].label).toBe('Normal Tag');
		});

		it('should handle empty string tag names', () => {
			const rawTags: RawTags = {
				test: ['', 'valid'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].name).toBe('');
			expect(enriched[0].label).toBe('');
			expect(enriched[1].name).toBe('valid');
			expect(enriched[1].label).toBe('Valid');
		});

		it('should handle numeric-like strings', () => {
			const rawTags: RawTags = {
				numbers: ['123', '456-789', '0.5'],
			};

			const enriched = enrichTags(rawTags);

			expect(enriched[0].label).toBe('0.5');
			expect(enriched[1].label).toBe('123');
			expect(enriched[2].label).toBe('456-789');
		});
	});
});
