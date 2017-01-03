import pako from 'pako';

const atob = require('atob');

const decodeFromBase64 = (string) =>
{
	const binary      = atob(string);
	const arrayBuffer = new Uint8Array(new ArrayBuffer(binary.length));

	for (let i = 0; i < binary.length; i++)
	{
		arrayBuffer[i] = binary.charCodeAt(i);
	}

	const unzipped = pako.inflate(arrayBuffer);
	const luaCode = new TextDecoder("utf-16le").decode(new Uint16Array(unzipped));

	const match = luaCode.match(/do local _=([\s\S]+);return _;end/);
	if (!match)
	{
		throw new Error(`Invalid blueprint string: ${luaCode}`);
	}

	return match[1];
};

export default decodeFromBase64;
