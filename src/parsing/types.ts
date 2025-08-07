import type {
	BlueprintContent as Blueprint,
	BlueprintBook,
	RawBlueprintData as BlueprintString,
	DeconstructionPlanner,
	BlueprintEntity as Entity,
	BlueprintIcon as Icon,
	BlueprintTile as Tile,
	UpgradePlanner,
} from '../schemas';

export type {Icon, Entity, Tile, Blueprint, BlueprintBook, UpgradePlanner, DeconstructionPlanner, BlueprintString};

import type {Quality, SignalID, SignalType} from '../types/factorio';
export type {SignalType, Quality, SignalID};

export interface Position {
	x: number;
	y: number;
}

export interface ItemStack {
	id: {
		name: string;
		quality?: Quality;
	};
	items: {
		in_inventory: {
			inventory: number;
			stack: number;
			count?: number;
		}[];
	};
}

export interface Parameter {
	type: 'id' | 'number';
	name: string;
	id?: string;
	number?: string;
	variable?: string;
	formula?: string;
	dependent?: boolean;
	'not-parametrised'?: boolean;
	'quality-condition'?: {
		quality: Quality;
		comparator: string;
	};
	'ingredient-of'?: string;
}
