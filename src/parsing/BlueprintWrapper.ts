import type {BlueprintIcon, BlueprintContent, RawBlueprintData} from '../schemas';

interface BlueprintInfo {
	type: 'blueprint' | 'blueprint-book' | 'upgrade-planner' | 'deconstruction-planner';
	content: BlueprintContent;
	label?: string;
	description?: string;
	icons: BlueprintIcon[];
	version?: number;
}

export class BlueprintWrapper {
	private data: RawBlueprintData;

	constructor(blueprint: RawBlueprintData) {
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
			const settings = this.data.upgrade_planner.settings as any;
			return settings?.description;
		}
		if (this.data.deconstruction_planner) {
			const settings = this.data.deconstruction_planner.settings as any;
			return settings?.description;
		}
		throw new Error('Invalid blueprint: no content found');
	}

	getIcons(): BlueprintIcon[] {
		if (this.data.blueprint) {
			return this.data.blueprint.icons ?? [];
		}
		if (this.data.blueprint_book) {
			const book = this.data.blueprint_book as any;
			return book.icons ?? [];
		}
		if (this.data.upgrade_planner) {
			const settings = this.data.upgrade_planner.settings as any;
			return settings?.icons ?? [];
		}
		if (this.data.deconstruction_planner) {
			const settings = this.data.deconstruction_planner.settings as any;
			return settings?.icons ?? [];
		}
		throw new Error('Invalid blueprint: no content found');
	}

	getVersion(): number | undefined {
		return this.getContent().version;
	}

	getRawData(): RawBlueprintData {
		return this.data;
	}
}
