import '@testing-library/jest-dom';
import {cleanup} from '@testing-library/react';
import {afterEach, vi} from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';

// Mock the entire FontAwesome React component to avoid package.json import issues
vi.mock('@fortawesome/react-fontawesome', () => ({
	FontAwesomeIcon: ({icon, ...props}: any) =>
		React.createElement('i', {'data-testid': 'font-awesome-icon', 'data-icon': icon, ...props}),
}));

// Cleanup after each test
afterEach(() => {
	cleanup();
});
