import buildImageUrl from './buildImageUrl';

describe('buildImageUrl', () => {
	it('reads every Imgur size through the image gateway, so images load where Imgur is blocked', () => {
		expect([
			buildImageUrl('alice10', 'image/png', ''),
			buildImageUrl('alice10', 'image/png', 'b'),
			buildImageUrl('alice10', 'image/jpeg', 'l'),
			buildImageUrl('alice10', 'image/gif', 'l'),
		]).toStrictEqual([
			'https://images.factorioprints.com/legacy-imgur/alice10/original.png',
			'https://images.factorioprints.com/legacy-imgur/alice10/thumbnail.png',
			'https://images.factorioprints.com/legacy-imgur/alice10/large.jpeg',
			'https://images.factorioprints.com/legacy-imgur/alice10/large.gif',
		]);
	});

	it('uses a configured gateway origin', () => {
		expect(buildImageUrl('alice10', 'image/png', 'b', 'http://localhost:8787')).toBe(
			'http://localhost:8787/legacy-imgur/alice10/thumbnail.png',
		);
	});

	it('falls back to PNG for a missing or unsupported type', () => {
		expect([buildImageUrl('alice10', '', 'b'), buildImageUrl('alice10', 'image/webp', 'l')]).toStrictEqual([
			'https://images.factorioprints.com/legacy-imgur/alice10/thumbnail.png',
			'https://images.factorioprints.com/legacy-imgur/alice10/large.png',
		]);
	});

	it('rejects an Imgur size the gateway does not serve', () => {
		expect(() => buildImageUrl('alice10', 'image/png', 'm')).toThrow(
			new Error('The image gateway has no Imgur size "m"'),
		);
	});
});
