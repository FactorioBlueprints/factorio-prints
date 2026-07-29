import {describe, expect, it} from 'vite-plus/test';
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

	it('attaches router lifecycle diagnostics to missing-match failures', () => {
		expect(mainSource).toContain("eventMessage.includes('_nonReactive')");
		expect(mainSource).toContain('router: getRouterDiagnostics()');
	});
});
