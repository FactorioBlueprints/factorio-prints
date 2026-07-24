import {describe, expect, it} from 'vitest';
import mainSource from './main.tsx?raw';

describe('Sentry startup configuration', () => {
	it('keeps heavyweight optional integrations out of the initial bundle', () => {
		expect(mainSource).not.toContain('import * as Sentry');
		expect(mainSource).not.toContain('replayIntegration');
		expect(mainSource).not.toContain('feedbackIntegration');
	});

	it('samples a bounded share of performance traces', () => {
		expect(mainSource).toContain('tracesSampleRate: 0.1');
	});
});
