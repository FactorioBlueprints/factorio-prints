import {isChunkLoadError, isDOMManipulationError} from './errorFiltering';

describe('isDOMManipulationError', () => {
	it('returns false for null', () => {
		expect(isDOMManipulationError(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isDOMManipulationError(undefined)).toBe(false);
	});

	it('returns true for a DOMException with NOT_FOUND_ERR code 8', () => {
		const error = new DOMException('anything at all', 'NotFoundError');
		expect(isDOMManipulationError(error)).toBe(true);
	});

	it('returns true for the FACTORIO-SCHOOL-2 removeChild error', () => {
		const error = new Error(
			"Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
		);
		expect(isDOMManipulationError(error)).toBe(true);
	});

	it('returns true for the FACTORIO-SCHOOL-5 insertBefore error', () => {
		const error = new Error(
			"Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
		);
		expect(isDOMManipulationError(error)).toBe(true);
	});

	it('returns true for an appendChild error', () => {
		const error = new Error("Failed to execute 'appendChild' on 'Node': something went wrong.");
		expect(isDOMManipulationError(error)).toBe(true);
	});

	it('returns true for a bare string mentioning NotFoundError', () => {
		expect(isDOMManipulationError('NotFoundError: node missing')).toBe(true);
	});

	it('returns false for an unrelated TypeError', () => {
		expect(isDOMManipulationError(new TypeError('x is not a function'))).toBe(false);
	});

	it('returns false for an unrelated string', () => {
		expect(isDOMManipulationError('Network request failed')).toBe(false);
	});
});

describe('isChunkLoadError', () => {
	it('returns false for null', () => {
		expect(isChunkLoadError(null)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isChunkLoadError(undefined)).toBe(false);
	});

	it('returns true for a webpack ChunkLoadError by name', () => {
		const error = new Error('whatever the message says');
		error.name = 'ChunkLoadError';
		expect(isChunkLoadError(error)).toBe(true);
	});

	it('returns true for a webpack "Loading chunk" message', () => {
		expect(isChunkLoadError(new Error('Loading chunk 42 failed.'))).toBe(true);
	});

	it('returns true for a webpack "Loading CSS chunk" message', () => {
		expect(isChunkLoadError(new Error('Loading CSS chunk 7 failed.'))).toBe(true);
	});

	it('returns true for a failed dynamic import', () => {
		expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/x.js'))).toBe(true);
	});

	it('returns true for a bare string mentioning a dynamically imported module', () => {
		expect(isChunkLoadError('error loading dynamically imported module')).toBe(true);
	});

	it('returns false for an unrelated TypeError', () => {
		expect(isChunkLoadError(new TypeError('x is not a function'))).toBe(false);
	});

	it('returns false for a DOM manipulation error', () => {
		const error = new Error("Failed to execute 'removeChild' on 'Node': not a child of this node.");
		expect(isChunkLoadError(error)).toBe(false);
	});
});
