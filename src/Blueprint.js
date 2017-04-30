import decodeV14Base64, {decodeV15Base64} from './parser/decodeFromBase64';
import luaTableToJsonObject from './parser/luaTableToJsonObject';

class Blueprint
{
	constructor(encodedText)
	{
		this.encodedText = encodedText;
		this.decodedObject = this.convertEncodedTextToObject();
	}

	isV14 = () => this.encodedText.startsWith('H4sIAAAAAAAA/');
	isV15 = () => this.encodedText.startsWith('0');

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

}

export default Blueprint;
