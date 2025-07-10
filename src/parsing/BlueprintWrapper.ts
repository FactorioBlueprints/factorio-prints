// Blueprint wrapper data structure interfaces
interface BlueprintIcon {
	signal: {
		name: string;
		type: string;
	};
	index: number;
}

interface BlueprintContent {
	label?: string;
	description?: string;
	version?: number;
	icons?: BlueprintIcon[];
	[key: string]: unknown;
}

interface BlueprintData {
	blueprint?: BlueprintContent;
	blueprint_book?: BlueprintContent;
	upgrade_planner?: {
		settings?: {
			description?: string;
			icons?: BlueprintIcon[];
			[key: string]: unknown;
		};
		label?: string;
		version?: number;
		[key: string]: unknown;
	};
	deconstruction_planner?: {
		settings?: {
			description?: string;
			icons?: BlueprintIcon[];
			[key: string]: unknown;
		};
		label?: string;
		version?: number;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

interface BlueprintInfo {
	type: 'blueprint' | 'blueprint-book' | 'upgrade-planner' | 'deconstruction-planner';
	content: BlueprintContent;
	label?: string;
	description?: string;
	icons: BlueprintIcon[];
	version?: number;
}

export class BlueprintWrapper {
	private data: BlueprintData;

	constructor(blueprint: BlueprintData) {
		this.data = blueprint;
	}

	getInfo(): BlueprintInfo {
		const content = this.getContent();
		return {
			type: this.getType(),
			content,
			label: content.label,
			description: this.getDescription(),
			icons: this.getIcons(),
			version: content.version,
		};
	}

	getType(): 'blueprint' | 'blueprint-book' | 'upgrade-planner' | 'deconstruction-planner' {
		if (this.data.blueprint) return 'blueprint';
		if (this.data.blueprint_book) return 'blueprint-book';
		if (this.data.upgrade_planner) return 'upgrade-planner';
		if (this.data.deconstruction_planner) return 'deconstruction-planner';
		throw new Error('Invalid blueprint: no recognized type found');
	}

	getContent(): BlueprintContent {
		if (this.data.blueprint) return this.data.blueprint;
		if (this.data.blueprint_book) return this.data.blueprint_book;
		if (this.data.upgrade_planner) return this.data.upgrade_planner;
		if (this.data.deconstruction_planner) return this.data.deconstruction_planner;
		throw new Error('Invalid blueprint: no content found');
	}

	getLabel(): string | undefined {
		return this.getContent().label;
	}

	getDescription(): string | undefined {
		if (this.data.blueprint) {
			return this.data.blueprint.description;
		}
		if (this.data.blueprint_book) {
			return this.data.blueprint_book.description;
		}
		if (this.data.upgrade_planner) {
			return this.data.upgrade_planner.settings?.description;
		}
		if (this.data.deconstruction_planner) {
			return this.data.deconstruction_planner.settings?.description;
		}
		throw new Error('Invalid blueprint: no content found');
	}

	getIcons(): BlueprintIcon[] {
		if (this.data.blueprint) {
			return this.data.blueprint.icons ?? [];
		}
		if (this.data.blueprint_book) {
			return this.data.blueprint_book.icons ?? [];
		}
		if (this.data.upgrade_planner) {
			return this.data.upgrade_planner.settings?.icons ?? [];
		}
		if (this.data.deconstruction_planner) {
			return this.data.deconstruction_planner.settings?.icons ?? [];
		}
		throw new Error('Invalid blueprint: no content found');
	}

	getVersion(): number | undefined {
		return this.getContent().version;
	}

	getRawData(): BlueprintData {
		return this.data;
	}
}
