import {decodeV15Base64} from './parser/decodeFromBase64';

class Blueprint {
	private readonly encodedText: string;

	private cachedDecodedObject: any;

	constructor(encodedText: string) {
		this.encodedText = encodedText;
	}

	get decodedObject(): any {
		if (this.cachedDecodedObject == null) {
			this.cachedDecodedObject = this.convertEncodedTextToObject();
		}
		return this.cachedDecodedObject;
	}

	convertEncodedTextToObject(): any {
		try {
			const jsonString: string = decodeV15Base64(this.encodedText);
			return JSON.parse(jsonString);
		} catch (_e) {
			return undefined;
		}
	}

	isBook(): boolean {
		return this.decodedObject.blueprint_book !== undefined;
	}

	isBlueprint(): boolean {
		return this.decodedObject.blueprint !== undefined;
	}

	isUpgradePlanner(): boolean {
		return this.decodedObject.upgrade_planner !== undefined;
	}

	getV15Decoded(): any {
		return this.decodedObject;
	}
}

export default Blueprint;
