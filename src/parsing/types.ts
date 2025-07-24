// Import types from schemas that are already defined
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

// Re-export with the names expected by the migrated components
export type {Icon, Entity, Tile, Blueprint, BlueprintBook, UpgradePlanner, DeconstructionPlanner, BlueprintString};

// Additional types needed by components
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
