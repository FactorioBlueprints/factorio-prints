import flatMap from 'lodash/flatMap';
import forOwn from 'lodash/forOwn';
import countBy from 'lodash/fp/countBy';
import flow from 'lodash/fp/flow';
import reverse from 'lodash/fp/reverse';
import sortBy from 'lodash/fp/sortBy';
import toPairs from 'lodash/fp/toPairs';
import has from 'lodash/has';
import {useCallback, useMemo} from 'react';
import type {BlueprintContent, BlueprintEntity, BlueprintTile} from '../schemas';

interface ItemData {
	item?: string;
	count?: number;
	id?: {
		name: string;
	};
	items?: {
		in_inventory?: any[];
	};
}

export function useBlueprintHistograms(decodedBlueprint: any) {
	const entityHistogram = useCallback((parsedBlueprint: BlueprintContent): [string, number][] => {
		const entities = parsedBlueprint.entities || [];
		const tiles = parsedBlueprint.tiles || [];
		const validEntities = [...entities, ...tiles].filter(
			(entity) => typeof entity.name === 'string' || typeof entity.name === 'number',
		);

		return flow(
			countBy<BlueprintEntity | BlueprintTile>('name'),
			toPairs,
			sortBy(1),
			reverse,
		)(validEntities) as unknown as [string, number][];
	}, []);

	const itemHistogram = useCallback((parsedBlueprint: BlueprintContent): [string, number][] => {
		const result: Record<string, number> = {};
		const items = flatMap(parsedBlueprint.entities, (entity) => (entity.items || []) as ItemData[]);

		items.forEach((item) => {
			// Handle original format: {item: "copper-cable", count: 5}
			if (has(item, 'item') && has(item, 'count')) {
				result[item.item!] = (result[item.item!] || 0) + item.count!;
			}
			// Handle new format with id.name and items structure
			else if (has(item, 'id') && has(item.id, 'name')) {
				const itemName = item.id!.name;
				// Count the number of stacks if items.in_inventory exists
				if (has(item, 'items') && item.items && has(item.items, 'in_inventory')) {
					const inventory = item.items.in_inventory as any;
					if (Array.isArray(inventory)) {
						const stackCount = inventory.length;
						result[itemName] = (result[itemName] || 0) + stackCount;
					} else if (inventory) {
						result[itemName] = (result[itemName] || 0) + 1;
					}
				}
				// Just count it once if we can't determine the stack count
				else {
					result[itemName] = (result[itemName] || 0) + 1;
				}
			}
			// Handle old style direct key-value pairs: {"copper-cable": 5}
			else if (typeof item === 'object') {
				forOwn(item, (value, key) => {
					// Skip non-primitive values that might cause [object Object] rendering
					if (typeof value !== 'object' || value === null) {
						result[key] = (result[key] || 0) + (value as number);
					}
				});
			}
		});

		return flow(toPairs, sortBy(1), reverse)(result) as unknown as [string, number][];
	}, []);

	const memoizedEntityHistogram = useMemo(() => {
		return decodedBlueprint?.blueprint ? entityHistogram(decodedBlueprint.blueprint) : [];
	}, [decodedBlueprint, entityHistogram]);

	const memoizedItemHistogram = useMemo(() => {
		return decodedBlueprint?.blueprint ? itemHistogram(decodedBlueprint.blueprint) : [];
	}, [decodedBlueprint, itemHistogram]);

	return {
		entityHistogram: memoizedEntityHistogram,
		itemHistogram: memoizedItemHistogram,
	};
}
