import '@testing-library/jest-dom';
import {cleanup} from '@testing-library/react';
import {afterEach, vi} from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';

vi.mock('@fortawesome/fontawesome-svg-core', () => ({
	library: {
		add: vi.fn(),
	},
	icon: vi.fn(() => ({
		abstract: [],
		html: ['<svg></svg>'],
	})),
	config: {
		autoAddCss: false,
	},
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: vi.fn(({icon, className}) => {
		return `<i class="${className}" data-testid="font-awesome-icon" data-icon="${typeof icon === 'string' ? icon : 'mocked-icon'}"></i>`;
	}),
}));

afterEach(() => {
	cleanup();
});
