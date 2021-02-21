import {TextEncoder} from 'fastestsmallesttextencoderdecoder';
import pako          from 'pako';

const atob = require('atob');

export const decodeV15Base64 = (string) =>
{
	const binary      = atob(string.slice(1));
	const arrayBuffer = new Uint8Array(new ArrayBuffer(binary.length));

	for (let i = 0; i < binary.length; i++)
	{
		arrayBuffer[i] = binary.charCodeAt(i);
	}

	const unzipped    = pako.inflate(arrayBuffer);
	const jsonCode = fromCharCode(unzipped);

	return jsonCode;
};

function fromCharCode(bytes)
{
	let result = '';
	for (var i = 0; i < bytes.byteLength; i++)
	{
		result += String.fromCharCode(bytes[i]);
	}
	return result;
}

export const encodeV15ToBase64 = (jsonCode) =>
{
	const unzipped = new TextEncoder().encode(jsonCode);
	const arrayBuffer  = pako.deflate(unzipped);

	const string = btoa(String.fromCharCode.apply(null, arrayBuffer));
	return `0${string}`;
};
