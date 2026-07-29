import {render, screen} from '@testing-library/react';
import type React from 'react';
import {describe, expect, it, vi} from 'vite-plus/test';
import type {RestBlueprintSummary} from '../../api/rest/types';
import RestBlueprintThumbnail from './RestBlueprintThumbnail';

vi.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: () => <span />,
}));

vi.mock('@tanstack/react-router', () => ({
	Link: ({children}: {children: React.ReactNode}) => <a href="/">{children}</a>,
}));

vi.mock('../../helpers/buildImageUrl', () => ({
	default: () => 'https://example.com/thumbnail.png',
}));

vi.mock('../core/text/RichText', () => ({
	RichText: ({text}: {text: string}) => <>{text}</>,
}));

vi.mock('../SafeOverlayTrigger', () => ({
	default: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

const blueprintSummary = {
	key: 'blueprint-id',
	title: 'Blueprint title',
	voteSummary: {
		numberOfUpvotes: 3,
	},
	imgurImage: {
		imgurId: 'example',
		imgurType: 'image/png',
	},
} satisfies RestBlueprintSummary;

describe('RestBlueprintThumbnail metadata', () => {
	it('visually hides the favorites label without consuming title space', () => {
		render(<RestBlueprintThumbnail blueprintSummary={blueprintSummary} />);

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
