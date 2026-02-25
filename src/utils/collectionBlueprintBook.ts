import type {BlueprintBookEntry, RawBlueprintData} from '../schemas';

interface SyntheticBlueprintBookOptions {
	label?: string;
	description?: string;
}

const toBlueprintBookEntry = (blueprint: RawBlueprintData, index: number): BlueprintBookEntry => {
	if (blueprint.blueprint) {
		return {
			index,
			blueprint: blueprint.blueprint,
		};
	}

	if (blueprint.blueprint_book) {
		return {
			index,
			blueprint_book: blueprint.blueprint_book,
		};
	}

	if (blueprint.upgrade_planner) {
		return {
			index,
			upgrade_planner: blueprint.upgrade_planner,
		};
	}

	if (blueprint.deconstruction_planner) {
		return {
			index,
			deconstruction_planner: blueprint.deconstruction_planner,
		};
	}

	throw new Error(`Blueprint at position ${index} is not a supported blueprint type`);
};

const getMaxVersionFromEntry = (entry: BlueprintBookEntry): number => {
	if (entry.blueprint?.version) return entry.blueprint.version;
	if (entry.upgrade_planner?.version) return entry.upgrade_planner.version;
	if (entry.deconstruction_planner?.version) return entry.deconstruction_planner.version;
	if (entry.blueprint_book) {
		const nested = entry.blueprint_book.blueprints?.map(getMaxVersionFromEntry) ?? [];
		return Math.max(entry.blueprint_book.version ?? 0, ...nested);
	}
	return 0;
};

export const getMaxVersion = (blueprints: RawBlueprintData[]): number => {
	let max = 0;
	for (const bp of blueprints) {
		if (bp.blueprint?.version) max = Math.max(max, bp.blueprint.version);
		if (bp.upgrade_planner?.version) max = Math.max(max, bp.upgrade_planner.version);
		if (bp.deconstruction_planner?.version) max = Math.max(max, bp.deconstruction_planner.version);
		if (bp.blueprint_book) {
			const bookVersion = bp.blueprint_book.version ?? 0;
			const nested = bp.blueprint_book.blueprints?.map(getMaxVersionFromEntry) ?? [];
			max = Math.max(max, bookVersion, ...nested);
		}
	}
	return max;
};

export const createSyntheticBlueprintBook = (
	blueprints: RawBlueprintData[],
	options: SyntheticBlueprintBookOptions = {},
): RawBlueprintData => {
	if (blueprints.length === 0) {
		throw new Error('Cannot create a synthetic blueprint book from an empty collection');
	}

	const entries = blueprints.map((blueprint, index) => toBlueprintBookEntry(blueprint, index + 1));

	return {
		blueprint_book: {
			item: 'blueprint-book',
			label: options.label || 'Blueprint Collection',
			description: options.description,
			active_index: 0,
			version: getMaxVersion(blueprints) || undefined,
			blueprints: entries,
		},
	};
};

export const copyBlueprintStringToClipboard = async (blueprintString: string): Promise<void> => {
	if (!blueprintString) {
		throw new Error('Cannot copy an empty blueprint string');
	}

	if (!navigator.clipboard?.writeText) {
		throw new Error('Clipboard access is unavailable in this browser/session');
	}

	await navigator.clipboard.writeText(blueprintString);
};
