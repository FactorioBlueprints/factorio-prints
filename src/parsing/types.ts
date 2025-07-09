// Import types from schemas that are already defined
import type {
	BlueprintIcon as Icon,
	BlueprintEntity as Entity,
	BlueprintTile as Tile,
	BlueprintContent as Blueprint,
	BlueprintBook,
	UpgradePlanner,
	DeconstructionPlanner,
	RawBlueprintData as BlueprintString,
} from '../schemas';

// Re-export with the names expected by the migrated components
export type {Icon, Entity, Tile, Blueprint, BlueprintBook, UpgradePlanner, DeconstructionPlanner, BlueprintString};

// Additional types needed by components
import type {SignalType, Quality, SignalID} from '../types/factorio';
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
