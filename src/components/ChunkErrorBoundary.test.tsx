import {render, screen} from '@testing-library/react';
import type React from 'react';
import ChunkErrorBoundary from './ChunkErrorBoundary';

function ThrowChunkLoadError(): React.ReactElement {
	const error = new Error('Loading chunk 42 failed.');
	error.name = 'ChunkLoadError';
	throw error;
}

describe('ChunkErrorBoundary', () => {
	let consoleError: jest.SpyInstance;

	beforeEach(() => {
		// React logs caught boundary errors to console.error; silence it for readable output.
		consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleError.mockRestore();
	});

	it('renders children when nothing throws', () => {
		render(
			<ChunkErrorBoundary>
				<p>Blueprint list</p>
			</ChunkErrorBoundary>,
		);

		expect(screen.getByText('Blueprint list')).toBeInTheDocument();
	});

	it('renders the refresh prompt when a child throws a ChunkLoadError', () => {
		render(
			<ChunkErrorBoundary>
				<ThrowChunkLoadError />
			</ChunkErrorBoundary>,
		);

		expect(screen.getByText('A new version is available')).toBeInTheDocument();
		expect(screen.getByRole('button', {name: 'Refresh Now'})).toBeInTheDocument();
	});
});
