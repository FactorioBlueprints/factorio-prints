import {decodeV15Base64} from './parser/decodeFromBase64';

class Blueprint
{
	constructor(encodedText)
	{
		this.encodedText = encodedText;
	}

	get decodedObject()
	{
		if (this.cachedDecodedObject == null)
		{
			this.cachedDecodedObject = this.convertEncodedTextToObject();
		}
		return this.cachedDecodedObject;
	}

	convertEncodedTextToObject = () =>
	{
		const jsonString = decodeV15Base64(this.encodedText);
		return JSON.parse(jsonString);
	};

	isBook = () =>
	{
		return this.decodedObject.blueprint_book !== undefined;
	};

	isBlueprint = () =>
	{
		return this.decodedObject.blueprint !== undefined;
	};

	isUpgradePlanner = () =>
	{
		return this.decodedObject.upgrade_planner !== undefined;
	};

	getV15Decoded = () =>
	{
		return this.decodedObject;
	};
}

export default Blueprint;
