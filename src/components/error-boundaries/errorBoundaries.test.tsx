import * as Sentry from '@sentry/react';
import {render} from '@testing-library/react';
import type React from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import ErrorFallback, {reportErrorToSentry} from '../ErrorFallback';
import {AdSenseErrorBoundary, AppErrorBoundary, AsyncErrorBoundary, DOMErrorBoundary} from './index';

jest.mock('@sentry/react', () => ({
	captureException: jest.fn(),
}));

const captureException = Sentry.captureException as jest.Mock;

function Thrower({error}: {error: Error}): React.ReactElement {
	throw error;
}

function EditErrorBoundary({children}: {children: React.ReactNode}) {
	return (
		<ErrorBoundary
			FallbackComponent={ErrorFallback}
			onError={reportErrorToSentry}
		>
			{children}
		</ErrorBoundary>
	);
}

const boundaries: [string, React.ComponentType<{children: React.ReactNode}>, string, string][] = [
	['AppErrorBoundary', AppErrorBoundary, 'AppErrorBoundary', 'ApplicationCrash'],
	['AsyncErrorBoundary', AsyncErrorBoundary, 'AsyncErrorBoundary', 'AsyncOperation'],
	['DOMErrorBoundary', DOMErrorBoundary, 'DOMErrorBoundary', 'DOMManipulation'],
	['AdSenseErrorBoundary', AdSenseErrorBoundary, 'AdSenseErrorBoundary', 'Advertisement'],
	['ErrorFallback', EditErrorBoundary, 'ErrorBoundary', 'UIError'],
];

describe.each(boundaries)('%s', (_name, Boundary, component, errorType) => {
	let consoleError: jest.SpyInstance;
	let consoleLog: jest.SpyInstance;

	beforeEach(() => {
		captureException.mockClear();
		// React logs caught boundary errors to console.error; silence it for readable output.
		consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
		consoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleError.mockRestore();
		consoleLog.mockRestore();
	});

	it('reports a caught error to Sentry exactly once, even after the fallback re-renders', () => {
		const error = new Error('Unexpected failure');
		const {rerender} = render(
			<Boundary>
				<Thrower error={error} />
			</Boundary>,
		);
		rerender(
			<Boundary>
				<Thrower error={error} />
			</Boundary>,
		);
		rerender(
			<Boundary>
				<Thrower error={error} />
			</Boundary>,
		);

		expect(captureException.mock.calls).toEqual([
			[
				error,
				{
					tags: {component, errorType},
					extra: {componentStack: expect.any(String)},
				},
			],
		]);
	});

	it('does not log the caught error to the console, which Sentry would capture again', () => {
		render(
			<Boundary>
				<Thrower error={new Error('Unexpected failure')} />
			</Boundary>,
		);

		expect(consoleLog.mock.calls).toEqual([]);
		expect(consoleError.mock.calls.filter(([message]) => String(message).includes('Boundary caught'))).toEqual([]);
	});
});
