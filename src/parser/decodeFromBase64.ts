import pako from 'pako';

import atob from 'atob';

export function decodeV15Base64(string: string): string
{
	const binary: string          = atob(string.slice(1));
	const arrayBuffer: Uint8Array = new Uint8Array(new ArrayBuffer(binary.length));

	for (let i = 0; i < binary.length; i++)
	{
		arrayBuffer[i] = binary.charCodeAt(i);
	}

	const unzipped: Uint8Array = pako.inflate(arrayBuffer);
	return fromCharCode(unzipped);
}

function fromCharCode(bytes: Uint8Array): string
{
	let result = '';
	for (let i = 0; i < bytes.byteLength; i++)
	{
		result += String.fromCharCode(bytes[i]);
	}
	return result;
}
