import {decodeV15Base64} from './parser/decodeFromBase64';

interface DecodedBlueprint {
	blueprint?: unknown;
	blueprint_book?: unknown;
	upgrade_planner?: unknown;
	[key: string]: unknown;
}

class Blueprint {
	private readonly encodedText: string;

	private cachedDecodedObject: DecodedBlueprint | undefined;

	constructor(encodedText: string) {
		this.encodedText = encodedText;
	}

	get decodedObject(): DecodedBlueprint | undefined {
		if (this.cachedDecodedObject == null) {
			this.cachedDecodedObject = this.convertEncodedTextToObject();
		}
		return this.cachedDecodedObject;
	}

	convertEncodedTextToObject(): DecodedBlueprint | undefined {
		try {
			const jsonString: string = decodeV15Base64(this.encodedText);
			return JSON.parse(jsonString) as DecodedBlueprint;
		} catch (_e) {
			return undefined;
		}
	}

	isBook(): boolean {
		return this.decodedObject?.blueprint_book !== undefined;
	}

	isBlueprint(): boolean {
		return this.decodedObject?.blueprint !== undefined;
	}

	isUpgradePlanner(): boolean {
		return this.decodedObject?.upgrade_planner !== undefined;
	}

	getV15Decoded(): DecodedBlueprint | undefined {
		return this.decodedObject;
	}
}

export default Blueprint;
