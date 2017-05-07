import decodeV14Base64, {decodeV15Base64} from './parser/decodeFromBase64';
import luaTableToJsonObject from './parser/luaTableToJsonObject';

class Blueprint
{
	constructor(encodedText)
	{
		this.encodedText = encodedText;
	}

	isV14 = () => this.encodedText.startsWith('H4sIAAAAAAAA/');
	isV15 = () => this.encodedText.startsWith('0');

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
		if (this.isV14())
		{
			return luaTableToJsonObject(decodeV14Base64(this.encodedText));
		}
		else if (this.isV15())
		{
			return JSON.parse(decodeV15Base64(this.encodedText));
		}

		throw new Error('Unknown blueprint format');
	};

	isBook = () =>
	{
		if (this.isV14())
		{
			return this.decodedObject.book !== undefined || this.decodedObject.type === 'blueprint-book';
		}
		else if (this.isV15())
		{
			return this.decodedObject.blueprint_book !== undefined;
		}

		throw new Error('Unknown blueprint format');
	};

	convertSingleBlueprint = (decodedObject = this.decodedObject) =>
	{
		if (!this.isV14())
		{
			throw new Error();
		}

		if (this.isBook())
		{
			throw new Error();
		}

		const {icons, name, entities} = decodedObject;

		const blueprint = {
			icons,
			entities: entities.map((entity, index) => ({entity_number: index + 1, ...entity})),
			item    : 'blueprint',
			label   : name,
			version : 12345567890,
		};

		return {blueprint};
	};

	convertSingleBookEntry = (decodedObject) =>
	{
		const {label, tiles, entities, icons} = decodedObject;

		return {
			icons,
			entities: (tiles || entities).map((entity, index) => ({entity_number: index + 1, ...entity})),
			item    : 'blueprint',
			label,
			version : 12345567890,
		};
	};

	convertBlueprintBook = (decodedObject = this.decodedObject) =>
	{
		if (!this.isV14())
		{
			throw new Error();
		}

		if (!this.isBook())
		{
			throw new Error();
		}

		if (decodedObject.data)
		{
			const {data: {label, active, main}} = decodedObject;
			const blueprints                    = active ? [active, ...main] : main;

			const convertedBlueprints = blueprints.map((blueprint, index) => (
				{
					blueprint: this.convertSingleBookEntry(blueprint),
					index,
				}));

			const blueprint_book = {
				blueprints  : convertedBlueprints,
				item        : 'blueprint-book',
				label,
				active_index: 0,
				version     : 12345567890,
			};

			return {blueprint_book};
		}
		return {blueprint_book: {blueprints: []}};
	};

	convert = () =>
	{
		if (!this.isV14())
		{
			throw new Error();
		}

		return this.isBook()
			? this.convertBlueprintBook()
			: this.convertSingleBlueprint();
	};

	getV15Decoded = () =>
	{
		if (this.isV15())
		{
			return this.decodedObject;
		}

		return this.convert();
	};
}

export default Blueprint;
