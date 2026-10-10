import {render, screen} from '@testing-library/react';
import ImgurThumbnail from './ImgurThumbnail';

jest.mock('../../hooks/useBlueprint', () => () => ({
	data: {data: {imgurImage: {imgurId: 'alice10', imgurType: 'image/jpeg'}}},
}));

describe('ImgurThumbnail', () => {
	it('shows the large image and links to the original, both through the image gateway', () => {
		render(<ImgurThumbnail blueprintKey="-KYeNAYQVgk2DcbuORde" />);

		expect(screen.getByRole('img')).toHaveAttribute(
			'src',
			'https://images.factorioprints.com/legacy-imgur/alice10/large.jpeg',
		);
		expect(screen.getByRole('link')).toHaveAttribute(
			'href',
			'https://images.factorioprints.com/legacy-imgur/alice10/original.jpeg',
		);
	});
});
