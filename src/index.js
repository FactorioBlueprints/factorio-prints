import * as Sentry from '@sentry/react';
import React from 'react';
import {createRoot} from 'react-dom/client';
import Root from './components/Root';

import './css/style.css';

import reportWebVitals from './reportWebVitals';
import {isChunkLoadError, isDOMManipulationError} from './utils/errorFiltering';

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

		// Handle chunk load errors by auto-reloading to get fresh HTML with correct chunks.
		// This is expected self-healing behavior, not logged to Sentry.
		if (isChunkLoadError(event.error)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			window.location.reload();
		}
	},
	true, // Capture phase - runs before Sentry's handler
);

/**
 * Handle unhandled promise rejections from dynamic imports.
 * When a chunk fails to load via React.lazy(), it surfaces as an unhandled rejection.
 */
window.addEventListener('unhandledrejection', (event) => {
	if (isChunkLoadError(event.reason)) {
		event.preventDefault();
		window.location.reload();
	}
});

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
		// Chunk load errors from stale deployments - handled by auto-reload, not actionable
		'ChunkLoadError',
		/Loading chunk/,
		/Loading CSS chunk/,
		/dynamically imported module/,
		/Failed to fetch dynamically imported module/,
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
