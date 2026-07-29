import {render, screen} from '@testing-library/react';
import type React from 'react';
import {describe, expect, it, vi} from 'vite-plus/test';
import type {EnrichedBlueprintSummary} from '../schemas';
import BlueprintThumbnail from './BlueprintThumbnail';

vi.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span />,
}));

vi.mock('@tanstack/react-router', () => ({
	Link: ({children}: {children: React.ReactNode}) => <a href="/">{children}</a>,
}));

vi.mock('firebase/auth', () => ({
	getAuth: () => ({}),
}));

vi.mock('react-firebase-hooks/auth', () => ({
	useAuthState: () => [null, false, undefined],
}));

vi.mock('../base', () => ({
	app: {},
}));

vi.mock('../helpers/buildImageUrl', () => ({
	default: () => 'https://example.com/thumbnail.png',
}));

vi.mock('../hooks/useToggleCollectionMutation', () => ({
	default: () => ({isPending: false, mutate: vi.fn()}),
}));

vi.mock('../hooks/useToggleFavoriteMutation', () => ({
	default: () => ({isPending: false, mutate: vi.fn()}),
}));

vi.mock('../hooks/useUser', () => ({
	useUserBlueprints: () => ({data: {}, isSuccess: true}),
	useUserCollection: () => ({data: {}, isSuccess: true}),
	useUserFavorites: () => ({data: {}, isSuccess: true}),
}));

vi.mock('../schemas', async (importOriginal) => {
	const original = await importOriginal<typeof import('../schemas')>();
	return {
		...original,
		validateEnrichedBlueprintSummary: vi.fn(),
	};
});

vi.mock('./core/text/RichText', () => ({
	RichText: ({text}: {text: string}) => <>{text}</>,
}));

vi.mock('./SafeOverlayTrigger', () => ({
	default: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

const blueprintSummary = {
	key: 'blueprint-id',
	title: 'Blueprint title',
	imgurId: 'example',
	imgurType: 'image/png',
	numberOfFavorites: 3,
} as EnrichedBlueprintSummary;

describe('BlueprintThumbnail image loading', () => {
	it('lazily decodes non-priority images in a reserved square', () => {
		render(<BlueprintThumbnail blueprintSummary={blueprintSummary} />);

		const image = screen.getByRole('img');
		expect({
			className: image.className,
			decoding: image.getAttribute('decoding'),
			fetchPriority: image.getAttribute('fetchpriority'),
			height: image.getAttribute('height'),
			loading: image.getAttribute('loading'),
			width: image.getAttribute('width'),
		}).toStrictEqual({
			className: 'card-img-top blueprint-thumbnail-image',
			decoding: 'async',
			fetchPriority: 'auto',
			height: '170',
			loading: 'lazy',
			width: '170',
		});
	});

	it('gives eager high priority to the designated LCP candidate', () => {
		render(
			<BlueprintThumbnail
				blueprintSummary={blueprintSummary}
				prioritizeImage
			/>,
		);

		const image = screen.getByRole('img');
		expect({
			className: image.className,
			decoding: image.getAttribute('decoding'),
			fetchPriority: image.getAttribute('fetchpriority'),
			height: image.getAttribute('height'),
			loading: image.getAttribute('loading'),
			width: image.getAttribute('width'),
		}).toStrictEqual({
			className: 'card-img-top blueprint-thumbnail-image',
			decoding: 'async',
			fetchPriority: 'high',
			height: '170',
			loading: 'eager',
			width: '170',
		});
	});
});

describe('BlueprintThumbnail metadata', () => {
	it('visually hides the favorites label without consuming title space', () => {
		render(<BlueprintThumbnail blueprintSummary={blueprintSummary} />);

		const favoritesLabel = screen.getByText('favorites');
		expect({
			favoritesLabelClassName: favoritesLabel.className,
			favoritesWrapperClassName: favoritesLabel.parentElement?.className,
			title: screen.getByText('Blueprint title').textContent,
		}).toStrictEqual({
			favoritesLabelClassName: 'visually-hidden',
			favoritesWrapperClassName: 'me-1',
			title: 'Blueprint title',
		});
	});
});
