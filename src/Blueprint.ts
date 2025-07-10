import {deserializeBlueprintNoThrow} from './parsing/blueprintParser';

// Blueprint data structure interfaces
interface BlueprintIcon {
	signal: {
		name: string;
		type: string;
	};
	index: number;
}

interface BlueprintEntity {
	entity_number: number;
	name: string;
	position: {
		x: number;
		y: number;
	};
	items?: Record<string, number>[] | {item: string; count: number}[];
	[key: string]: unknown;
}

interface BlueprintTile {
	name: string;
	position: {
		x: number;
		y: number;
	};
	[key: string]: unknown;
}

interface SingleBlueprint {
	blueprint: {
		icons?: BlueprintIcon[];
		entities?: BlueprintEntity[];
		tiles?: BlueprintTile[];
		item: string;
		label?: string;
		description?: string;
		version: number;
		[key: string]: unknown;
	};
}

interface BlueprintBookEntry {
	blueprint?: {
		icons?: BlueprintIcon[];
		entities?: BlueprintEntity[];
		tiles?: BlueprintTile[];
		item: string;
		label?: string;
		description?: string;
		version: number;
		[key: string]: unknown;
	} | null;
	index: number;
}

interface BlueprintBook {
	blueprint_book: {
		blueprints: BlueprintBookEntry[];
		item: string;
		label?: string;
		description?: string;
		active_index: number;
		version: number;
		[key: string]: unknown;
	};
}

interface UpgradePlanner {
	upgrade_planner: {
		settings?: unknown;
		item: string;
		label?: string;
		version?: number;
		[key: string]: unknown;
	};
}

// V15+ format interfaces
interface V15DecodedObject {
	blueprint?: {
		icons?: BlueprintIcon[];
		entities?: BlueprintEntity[];
		tiles?: BlueprintTile[];
		item?: string;
		label?: string;
		description?: string;
		version?: number;
		[key: string]: unknown;
	};
	blueprint_book?: {
		blueprints: BlueprintBookEntry[];
		item?: string;
		label?: string;
		description?: string;
		active_index?: number;
		version?: number;
		[key: string]: unknown;
	};
	upgrade_planner?: {
		settings?: unknown;
		item?: string;
		label?: string;
		version?: number;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

// Union type for all possible decoded objects
type DecodedObject = V15DecodedObject | undefined;

// Type for converted objects
type ConvertedBlueprint = SingleBlueprint | BlueprintBook;

class Blueprint {
	private encodedText: string;
	private cachedDecodedObject: DecodedObject = undefined;

	constructor(encodedText: string) {
		// TODO 2025-04-22: Assert that encodedText is truthy
		this.encodedText = encodedText;
	}

	isV15 = (): boolean => this.encodedText.startsWith('0');

	get decodedObject(): DecodedObject {
		if (this.cachedDecodedObject == null) {
			this.cachedDecodedObject = this.convertEncodedTextToObject();
		}
		return this.cachedDecodedObject;
	}

	private convertEncodedTextToObject = (): DecodedObject => {
		if (this.isV15()) {
			return deserializeBlueprintNoThrow(this.encodedText) as V15DecodedObject;
		}

		return undefined;
	};

	isBook = (): boolean => {
		if (this.isV15()) {
			const decoded = this.decodedObject as V15DecodedObject;
			return decoded?.blueprint_book !== undefined;
		}

		return false;
	};

	isBlueprint = (): boolean => {
		if (this.isV15()) {
			const decoded = this.decodedObject as V15DecodedObject;
			return decoded?.blueprint !== undefined;
		}

		return false;
	};

	isUpgradePlanner = (): boolean => {
		if (this.isV15()) {
			const decoded = this.decodedObject as V15DecodedObject;
			return decoded?.upgrade_planner !== undefined;
		}

		return false;
	};

	getV15Decoded = (): V15DecodedObject | null => {
		try {
			if (this.isV15()) {
				return this.decodedObject as V15DecodedObject;
			}

			return null;
		} catch {
			return null;
		}
	};
}

export default Blueprint;
export type {V15DecodedObject};
