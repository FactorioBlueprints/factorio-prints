import {describe, expect, it} from 'vitest';
import type {RawBlueprintData} from '../schemas';
import {createSyntheticBlueprintBook, getMaxVersion} from './collectionBlueprintBook';

describe('getMaxVersion', () => {
	it('returns 0 when no blueprints have versions', () => {
		const blueprints: RawBlueprintData[] = [{blueprint: {label: 'No version'}}];
		expect(getMaxVersion(blueprints)).toBe(0);
	});

	it('picks the highest version across different blueprint types', () => {
		const blueprints: RawBlueprintData[] = [
			{blueprint: {label: 'Old', version: 100}},
			{upgrade_planner: {label: 'Newer', version: 300}},
			{blueprint: {label: 'Mid', version: 200}},
		];
		expect(getMaxVersion(blueprints)).toBe(300);
	});

	it('finds version inside nested blueprint books', () => {
		const blueprints: RawBlueprintData[] = [
			{blueprint: {label: 'Top', version: 100}},
			{
				blueprint_book: {
					label: 'Book',
					version: 50,
					blueprints: [{index: 1, blueprint: {label: 'Deep', version: 999}}],
				},
			},
		];
		expect(getMaxVersion(blueprints)).toBe(999);
	});

	it('uses the book-level version when entries have no version', () => {
		const blueprints: RawBlueprintData[] = [
			{
				blueprint_book: {
					label: 'Book',
					version: 500,
					blueprints: [{index: 1, blueprint: {label: 'No version'}}],
				},
			},
		];
		expect(getMaxVersion(blueprints)).toBe(500);
	});
});

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
		expect(result.blueprint_book?.version).toBeUndefined();
		expect(result.blueprint_book?.blueprints).toHaveLength(3);
		expect(result.blueprint_book?.blueprints?.map((entry) => entry.index)).toEqual([1, 2, 3]);
		expect(result.blueprint_book?.blueprints?.[0]?.blueprint?.label).toBe('One');
		expect(result.blueprint_book?.blueprints?.[1]?.upgrade_planner?.label).toBe('Planner');
		expect(result.blueprint_book?.blueprints?.[2]?.blueprint_book?.label).toBe('Nested');
	});

	it('sets version from the highest version in the contained blueprints', () => {
		const blueprints: RawBlueprintData[] = [
			{blueprint: {label: 'Old', version: 100}},
			{blueprint: {label: 'New', version: 281479276986368}},
		];

		const result = createSyntheticBlueprintBook(blueprints);
		expect(result.blueprint_book?.version).toBe(281479276986368);
	});

	it('throws when trying to build from an empty set', () => {
		expect(() => createSyntheticBlueprintBook([])).toThrow(
			'Cannot create a synthetic blueprint book from an empty collection',
		);
	});
});
