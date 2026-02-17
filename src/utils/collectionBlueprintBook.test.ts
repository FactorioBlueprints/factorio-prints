import {describe, expect, it} from 'vitest';
import type {RawBlueprintData} from '../schemas';
import {createSyntheticBlueprintBook} from './collectionBlueprintBook';

describe('createSyntheticBlueprintBook', () => {
	it('builds a synthetic book with stable 1-based indices', () => {
		const blueprints: RawBlueprintData[] = [
			{blueprint: {label: 'One'}},
			{upgrade_planner: {label: 'Planner'}},
			{blueprint_book: {label: 'Nested', blueprints: []}},
		];

		const result = createSyntheticBlueprintBook(blueprints, {
			label: 'My Collection',
			description: 'Exported from Factorio Prints',
		});

		expect(result.blueprint_book?.item).toBe('blueprint-book');
		expect(result.blueprint_book?.label).toBe('My Collection');
		expect(result.blueprint_book?.description).toBe('Exported from Factorio Prints');
		expect(result.blueprint_book?.blueprints).toHaveLength(3);
		expect(result.blueprint_book?.blueprints?.map((entry) => entry.index)).toEqual([1, 2, 3]);
		expect(result.blueprint_book?.blueprints?.[0]?.blueprint?.label).toBe('One');
		expect(result.blueprint_book?.blueprints?.[1]?.upgrade_planner?.label).toBe('Planner');
		expect(result.blueprint_book?.blueprints?.[2]?.blueprint_book?.label).toBe('Nested');
	});

	it('throws when trying to build from an empty set', () => {
		expect(() => createSyntheticBlueprintBook([])).toThrow(
			'Cannot create a synthetic blueprint book from an empty collection',
		);
	});
});
