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
