import * as Sentry from '@sentry/react';
import React from 'react';
import {createRoot} from 'react-dom/client';
import Root from './components/Root';

import './css/style.css';

import reportWebVitals from './reportWebVitals';

/**
 * Check if an error is a DOM manipulation error from React/third-party conflicts.
 * These occur when third-party scripts (ads, Disqus, browser extensions) modify
 * DOM nodes that React is trying to manage.
 */
function isDOMManipulationError(error) {
	if (!error) return false;

	// Check DOMException by name or code
	if (error instanceof DOMException) {
		if (error.code === 8 || error.name === 'NotFoundError') {
			return true;
		}
	}

	// Check error message patterns
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("Failed to execute 'insertBefore'") ||
		message.includes("Failed to execute 'removeChild'") ||
		message.includes("Failed to execute 'appendChild'") ||
		message.includes('not a child of this node') ||
		message.includes('NotFoundError')
	);
}

/**
 * Global error handler to suppress DOM manipulation errors BEFORE Sentry sees them.
 * Must be registered BEFORE Sentry.init() and in capture phase to intercept first.
 * This catches errors from React's commit phase when third-party scripts interfere.
 */
window.addEventListener(
	'error',
	(event) => {
		if (isDOMManipulationError(event.error)) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	},
	true, // Capture phase - runs before Sentry's handler
);

Sentry.init({
	dsn: 'https://fa524dc2921181e29c183ca96949a681@o4509417677914112.ingest.us.sentry.io/4509423655911424',
	sendDefaultPii: true,
	// Filter known unactionable errors at the SDK level before they're processed
	// This is more reliable than beforeSend for errors that may have modified exception chains
	ignoreErrors: [
		// DOM manipulation errors from third-party scripts (ads, Disqus, browser extensions)
		// These occur when external code modifies DOM nodes that React is managing
		/Failed to execute 'insertBefore' on 'Node'/,
		/Failed to execute 'removeChild' on 'Node'/,
		/Failed to execute 'appendChild' on 'Node'/,
		/The node to be removed is not a child of this node/,
		/The node before which the new node is to be inserted is not a child of this node/,
		/not a child of this node/,
		'NotFoundError',
	],
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
		Sentry.captureConsoleIntegration({
			levels: ['error', 'assert', 'warn', 'info', 'log', 'debug'],
		}),
	],
	tracesSampleRate: 0.1,
	tracePropagationTargets: ['localhost', /^https:\/\/(www\.)?factorioprints\.(com|xyz)/],
	replaysSessionSampleRate: 0.001,
	replaysOnErrorSampleRate: 1.0,
	_experiments: {
		enableLogs: true,
	},
});

// Test Sentry logging
const {logger} = Sentry;
logger.info('Application started', {
	environment: process.env.NODE_ENV,
	timestamp: new Date().toISOString(),
});

const strictRoot = (
	<React.StrictMode>
		<Root />
	</React.StrictMode>
);

const container = document.getElementById('root');
const root = createRoot(container);
root.render(strictRoot);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
