import decodeV14Base64, {decodeV15Base64} from './parser/decodeFromBase64';
import luaTableToJsonObject from './parser/luaTableToJsonObject';
import sortBy from 'lodash/sortBy';
import toPairs from 'lodash/toPairs';
import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';

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
			const jsonString = decodeV15Base64(this.encodedText);
			return JSON.parse(jsonString);
		}

		return undefined;
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

		// Unknown format. Return false since most things won't work anyway.
		return false;
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

		const decode = () =>
		{
			if (decodedObject.data)
			{
				const {icons, label, entities} = decodedObject.data;
				return {icons, label, entities};
			}

			const {icons, name: label, entities} = decodedObject;
			return {icons, label, entities};
		};

		const {icons, label, entities} = decode();
		const convertedEntities = entities.map((entity, index) =>
		{
			const result = {
				...entity,
				entity_number: index + 1,
			};
			if (entity.items)
			{
				const convertedItems = entity.items.map(item => ({[item.item]: item.count}));
				result.items = convertedItems;
			}
			return result;
		});

		const blueprint = {
			icons,
			entities: convertedEntities,
			item    : 'blueprint',
			label,
			version : 12345567890,
		};

		return {blueprint};
	};

	convertSingleBookEntry = (decodedObject) =>
	{
		if (isNull(decodedObject))
		{
			return null;
		}

		const {label, name, tiles, entities, icons} = decodedObject;

		return {
			icons,
			entities: (tiles || entities).map((entity, index) => ({entity_number: index + 1, ...entity})),
			item    : 'blueprint',
			label   : label || name,
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

		const convertEmbeddedBlueprints = (rawBlueprints, label) =>
		{
			const blueprints = rawBlueprints.map((blueprint, index) =>
				({
					blueprint: this.convertSingleBookEntry(blueprint),
					index,
				}));

			return {
				blueprint_book: {
					blueprints,
					item        : 'blueprint-book',
					label,
					active_index: 0,
					version     : 12345567890,
				},
			};
		};

		if (decodedObject.data)
		{
			const {data: {label, active, main}} = decodedObject;
			const blueprints                    = active ? [
				active,
				...main,
			] : main;
			return convertEmbeddedBlueprints(blueprints, label);
		}
		if (decodedObject.book)
		{
			if (isArray(decodedObject.book))
			{
				const {book: [/* Empty first slot */, ...blueprints], name: label}  = decodedObject;
				return convertEmbeddedBlueprints(blueprints, label);
			}

			const pairs = toPairs(decodedObject.book);
			const sortedPairs = sortBy(pairs, 0);
			const blueprints = sortedPairs.map(pair => pair[1]);
			const label = decodedObject.label;

			return convertEmbeddedBlueprints(blueprints, label);
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
		try
		{
			if (this.isV15())
			{
				return this.decodedObject;
			}

			return this.convert();
		}
		catch (ignored)
		{
			return undefined;
		}
	};
}

export default Blueprint;
