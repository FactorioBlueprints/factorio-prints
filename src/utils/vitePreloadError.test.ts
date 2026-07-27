import {describe, expect, it, vi} from 'vitest';
import {createVitePreloadErrorHandler} from './vitePreloadError';

describe('Vite preload error recovery', () => {
	it('reloads without suppressing the rejected dynamic import', () => {
		const reloadPage = vi.fn();
		const event = Object.assign(new Event('vite:preloadError', {cancelable: true}), {
			payload: new TypeError('Failed to fetch dynamically imported module'),
		});

		createVitePreloadErrorHandler(reloadPage)(event);

		expect({
			defaultPrevented: event.defaultPrevented,
			reloadCalls: reloadPage.mock.calls,
		}).toStrictEqual({
			defaultPrevented: false,
			reloadCalls: [[]],
		});
	});
});
