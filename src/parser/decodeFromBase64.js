import pako from 'pako';

const atob = require('atob');

const decodeV14Base64 = (string) =>
{
	const binary      = atob(string);
	const arrayBuffer = new Uint8Array(new ArrayBuffer(binary.length));

	for (let i = 0; i < binary.length; i++)
	{
		arrayBuffer[i] = binary.charCodeAt(i);
	}

	const unzipped = pako.inflate(arrayBuffer);
	const luaCode = new TextDecoder('utf-16le').decode(new Uint16Array(unzipped));

	const match = luaCode.match(/do local _=([\s\S]+);return _;end/);
	if (!match)
	{
		throw new Error(`Invalid blueprint string: ${luaCode}`);
	}

	return match[1];
};

export const decodeV15Base64 = (string) =>
{
	const binary      = atob(string.slice(1));
	const arrayBuffer = new Uint8Array(new ArrayBuffer(binary.length));

	for (let i = 0; i < binary.length; i++)
	{
		arrayBuffer[i] = binary.charCodeAt(i);
	}

	const unzipped = pako.inflate(arrayBuffer);
	const jsonCode = new TextDecoder('utf-16le').decode(new Uint16Array(unzipped));
	return jsonCode;
};

export const encodeV15ToBase64 = (jsonCode) =>
{
	const unzipped = new TextEncoder().encode(jsonCode);
	const arrayBuffer  = pako.deflate(unzipped);

	const string = btoa(String.fromCharCode.apply(null, arrayBuffer));
	return `0${string}`;
};

export default decodeV14Base64;
