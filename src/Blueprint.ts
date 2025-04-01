import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';
import sortBy from 'lodash/sortBy';
import toPairs from 'lodash/toPairs';
import { deserializeBlueprint } from './parsing/blueprintParser.js';

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
	items?: Record<string, number>[] | { item: string; count: number }[];
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

// V14 legacy format interfaces
interface V14Entity {
	entity_number?: number;
	name: string;
	position: {
		x: number;
		y: number;
	};
	items?: { item: string; count: number }[];
	[key: string]: unknown;
}

interface V14DecodedObject {
	type?: string;
	blueprint?: unknown;
	book?: unknown[] | Record<string, unknown>;
	data?: {
		icons?: BlueprintIcon[];
		label?: string;
		entities?: V14Entity[];
		active?: unknown;
		main?: unknown[];
	};
	icons?: BlueprintIcon[];
	name?: string;
	label?: string;
	entities?: V14Entity[];
	tiles?: BlueprintTile[];
	[key: string]: unknown;
}

// V15+ format interfaces
interface V15DecodedObject {
	blueprint?: {
		icons?: BlueprintIcon[];
		entities?: BlueprintEntity[];
		tiles?: BlueprintTile[];
		item?: string;
		label?: string;
		version?: number;
		[key: string]: unknown;
	};
	blueprint_book?: {
		blueprints: BlueprintBookEntry[];
		item?: string;
		label?: string;
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
type DecodedObject = V14DecodedObject | V15DecodedObject | { type: 'unsupported-v14' } | undefined;

// Type for converted objects
type ConvertedBlueprint = SingleBlueprint | BlueprintBook;

class Blueprint {
	private encodedText: string;
	private cachedDecodedObject: DecodedObject = null;

	constructor(encodedText: string) {
		// TODO 2025-04-22: Assert that encodedText is truthy
		this.encodedText = encodedText;
	}

	isV14 = (): boolean => this.encodedText.startsWith('H4sIAAAAAAAA/');

	isV15 = (): boolean => this.encodedText.startsWith('0');

	get decodedObject(): DecodedObject {
		if (this.cachedDecodedObject == null) {
			this.cachedDecodedObject = this.convertEncodedTextToObject();
		}
		return this.cachedDecodedObject;
	}

	private convertEncodedTextToObject = (): DecodedObject => {
		if (this.isV14()) {
			console.warn('Blueprint version 0.14 is no longer supported');
			return { type: 'unsupported-v14' };
		} else if (this.isV15()) {
			try {
				return deserializeBlueprint(this.encodedText) as V15DecodedObject;
			} catch (error) {
				console.error('Error deserializing blueprint:', error);
				return undefined;
			}
		}

		return undefined;
	};

	isBook = (): boolean => {
		if (this.isV14()) {
			const decoded = this.decodedObject as V14DecodedObject;
			return decoded?.book !== undefined || decoded?.type === 'blueprint-book';
		} else if (this.isV15()) {
			const decoded = this.decodedObject as V15DecodedObject;
			return decoded?.blueprint_book !== undefined;
		}

		return false;
	};

	isBlueprint = (): boolean => {
		if (this.isV14()) {
			const decoded = this.decodedObject as V14DecodedObject;
			return decoded?.blueprint !== undefined || decoded?.type === 'blueprint';
		} else if (this.isV15()) {
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

	private convertSingleBlueprint = (decodedObject: V14DecodedObject = this.decodedObject as V14DecodedObject): SingleBlueprint => {
		if (!this.isV14()) {
			throw new Error('convertSingleBlueprint only supports V14 format');
		}

		if (this.isBook()) {
			throw new Error('convertSingleBlueprint cannot be used on blueprint books');
		}

		const decode = (): { icons?: BlueprintIcon[]; label?: string; entities?: V14Entity[] } => {
			if (decodedObject.data) {
				const { icons, label, entities } = decodedObject.data;
				return { icons, label, entities };
			}

			const { icons, name: label, entities } = decodedObject;
			return { icons, label, entities };
		};

		const { icons, label, entities } = decode();
		const convertedEntities: BlueprintEntity[] = (entities || []).map((entity, index) => {
			const result: BlueprintEntity = {
				...entity,
				entity_number: index + 1,
			};
			if (entity.items) {
				const convertedItems = entity.items.map(item => ({ [item.item]: item.count }));
				result.items = convertedItems;
			}
			return result;
		});

		const blueprint = {
			icons,
			entities: convertedEntities,
			item: 'blueprint',
			label,
			version: 12345567890,
		};

		return { blueprint };
	};

	private convertSingleBookEntry = (decodedObject: unknown): BlueprintBookEntry['blueprint'] => {
		if (isNull(decodedObject)) {
			return null;
		}

		const obj = decodedObject as V14DecodedObject;
		const { label, name, tiles, entities, icons } = obj;

		return {
			icons,
			entities: (tiles || entities || []).map((entity, index) => ({ entity_number: index + 1, ...entity })),
			item: 'blueprint',
			label: label || name,
			version: 12345567890,
		};
	};

	private convertBlueprintBook = (decodedObject: V14DecodedObject = this.decodedObject as V14DecodedObject): BlueprintBook => {
		if (!this.isV14()) {
			throw new Error('convertBlueprintBook only supports V14 format');
		}

		if (!this.isBook()) {
			throw new Error('convertBlueprintBook can only be used on blueprint books');
		}

		const convertEmbeddedBlueprints = (rawBlueprints: unknown[], label?: string): BlueprintBook => {
			const blueprints: BlueprintBookEntry[] = rawBlueprints.map((blueprint, index) => ({
				blueprint: this.convertSingleBookEntry(blueprint),
				index,
			}));

			return {
				blueprint_book: {
					blueprints,
					item: 'blueprint-book',
					label,
					active_index: 0,
					version: 12345567890,
				},
			};
		};

		if (decodedObject.data) {
			const { data: { label, active, main } } = decodedObject;
			const blueprints = active ? [active, ...(main || [])] : (main || []);
			return convertEmbeddedBlueprints(blueprints, label);
		}
		if (decodedObject.book) {
			if (isArray(decodedObject.book)) {
				/* Empty first slot */
				const { book: [, ...blueprints], name: label } = decodedObject as { book: unknown[]; name?: string };
				return convertEmbeddedBlueprints(blueprints, label);
			}

			const pairs = toPairs(decodedObject.book);
			const sortedPairs = sortBy(pairs, 0);
			const blueprints = sortedPairs.map(pair => pair[1]);
			const label = decodedObject.label;

			return convertEmbeddedBlueprints(blueprints, label);
		}
		return { blueprint_book: { blueprints: [], item: 'blueprint-book', active_index: 0, version: 12345567890 } };
	};

	private convert = (): ConvertedBlueprint => {
		if (!this.isV14()) {
			throw new Error('convert only supports V14 format');
		}

		return this.isBook()
			? this.convertBlueprintBook()
			: this.convertSingleBlueprint();
	};

	getV15Decoded = (): V15DecodedObject | ConvertedBlueprint | undefined => {
		try {
			if (this.isV15()) {
				return this.decodedObject as V15DecodedObject;
			}

			return this.convert();
		} catch {
			return undefined;
		}
	};
}

export default Blueprint;
