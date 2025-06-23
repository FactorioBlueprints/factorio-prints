import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from "@sentry/react";

import './css/style.css';
import QueryProvider from './providers/QueryProvider';
import { Router } from './router';

Sentry.init({
	dsn           : "https://1935b5b4cd539c3dc42578938c900979@o4509417677914112.ingest.us.sentry.io/4509417682632704",
	// Setting this option to true will send default PII data to Sentry.
	// For example, automatic IP address collection on events
	sendDefaultPii: true,
	// Set release version to match the build
	release       : import.meta.env.VITE_APP_VERSION || '0.1.0',
	integrations  : [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration(),
	],
	// Tracing
	tracesSampleRate        : 1.0, //  Capture 100% of the transactions
	// Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
	tracePropagationTargets : ["localhost", /^https:\/\/yourserver\.io\/api/],
	// Session Replay
	replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
	replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
	// Allow localhost URLs
	allowUrls               : [
		'http://localhost',
		'https://localhost',
		/localhost:\d{4}/,
		'https://factorioprints.com',
	],
	enabled   : true,
	beforeSend: (event, hint) =>
	{
		if (import.meta.env.DEV)
		{
			console.error('Sentry Error:', hint.originalException || hint.syntheticException);
		}
		return event;
	},
});

// Add Vite's preload error handler for module loading failures
window.addEventListener('vite:preloadError', (event) =>
{
	console.error('Vite preload error detected, reloading page...', event.payload);
	Sentry.captureException(event.payload, {
		tags: {
			error_type: 'vite_preload_error',
		},
		extra: {
			message: 'Module import failed during preload',
		},
	});
	event.preventDefault(); // Prevent the error from being thrown
	window.location.reload();
});

// Add global error handler for images
window.addEventListener('error', function(e)
{
	if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'IFRAME'))
	{
		// In development, log the error for debugging
		if (import.meta.env.DEV)
		{
			console.log('Image/iframe load error:', e.target.src);
		}
		// Prevent the error from bubbling up
		e.preventDefault();
		return true;
	}
}, true);

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
	<StrictMode>
		<HelmetProvider>
			<QueryProvider>
				<Router />
			</QueryProvider>
		</HelmetProvider>
	</StrictMode>,
);
