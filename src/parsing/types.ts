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
export type SignalType =
	| 'item'
	| 'entity'
	| 'recipe'
	| 'virtual'
	| 'fluid'
	| 'technology'
	| 'planet'
	| 'quality'
	| 'tile';
export type Quality = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary' | undefined;

export interface SignalID {
	name: string;
	type?: SignalType;
	quality?: Quality;
}

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
