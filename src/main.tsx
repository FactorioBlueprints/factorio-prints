import * as Sentry from '@sentry/react';
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import './css/style.css';
import QueryProvider from './providers/QueryProvider';
import {Router} from './router';

Sentry.init({
	dsn: 'https://1935b5b4cd539c3dc42578938c900979@o4509417677914112.ingest.us.sentry.io/4509417682632704',
	sendDefaultPii: true,
	release: import.meta.env.VITE_APP_VERSION || '0.1.0',
	environment: import.meta.env.PROD ? 'production' : 'development',
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration({
			maskAllInputs: false,
			blockAllMedia: false,
			maskAllText: false,
			ignore: [
				'[id^="dsq-"]',
				'.disqus-thread',
				'#disqus_thread',
				'iframe[src*="disqus.com"]',
				'iframe[name*="dsq-"]',
				'iframe[title*="Disqus"]',
			],
		}),
		Sentry.captureConsoleIntegration({
			levels: ['error', 'warn', 'info', 'debug'],
		}),
		Sentry.contextLinesIntegration(),
		Sentry.breadcrumbsIntegration({
			console: true,
			dom: true,
			fetch: true,
			history: true,
			sentry: true,
			xhr: true,
		}),
	],
	tracesSampleRate: 1.0,
	tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
	allowUrls: ['http://localhost', 'https://localhost', /localhost:\d{4}/, 'https://factorioprints.com'],
	enabled: !(window.location.hostname === 'localhost' && window.location.port === '3000'),
	// Set maxBreadcrumbs to capture more console logs
	maxBreadcrumbs: 100,
	// Attach stack traces to messages
	attachStacktrace: true,
	beforeSend: (event, hint) => {
		// Filter out Disqus errors
		const error = hint.originalException;
		if (error && error instanceof Error) {
			if (error.stack && (error.stack.includes('embed.js') || error.stack.includes('disqus'))) {
				return null; // Don't send to Sentry
			}
		}

		// Filter out cross-origin CSS access errors from Sentry replay
		if (error && error instanceof Error && error.message) {
			if (
				error.message.includes("Cannot get CSS styles from text's parentNode") ||
				error.message.includes(
					'SecurityError: CSSStyleSheet.cssRules getter: Not allowed to access cross-origin stylesheet',
				) ||
				error.message.includes('cross-origin stylesheet')
			) {
				return null; // Don't send cross-origin CSS errors to Sentry
			}
		}

		// Filter out Chrome extension errors
		if (event.exception?.values?.[0]?.stacktrace?.frames) {
			const frames = event.exception.values[0].stacktrace.frames;
			const hasExtensionFrame = frames.some(
				(frame) =>
					frame.filename &&
					(frame.filename.includes('chrome-extension://') ||
						frame.filename.includes('moz-extension://') ||
						frame.filename.includes('extension://') ||
						frame.filename.includes('safari-extension://') ||
						frame.filename.includes('edge://') ||
						frame.filename.includes('chrome://')),
			);
			if (hasExtensionFrame) {
				return null; // Don't send browser extension errors to Sentry
			}
		}

		if (import.meta.env.DEV) {
			// Use console.log instead of console.error to avoid triggering Sentry again
			console.log('Sentry Error:', hint.originalException || hint.syntheticException);
		}
		return event;
	},
	beforeBreadcrumb: (breadcrumb) => {
		return breadcrumb;
	},
});

window.addEventListener('vite:preloadError', (event) => {
	console.error('Vite preload error detected, reloading page...', event.payload);
	Sentry.captureException(event.payload, {
		tags: {
			error_type: 'vite_preload_error',
		},
		extra: {
			message: 'Module import failed during preload',
		},
	});
	event.preventDefault();
	window.location.reload();
});

window.addEventListener(
	'error',
	(e: ErrorEvent) => {
		const target = e.target as HTMLImageElement | HTMLIFrameElement | null;
		if (target && (target.tagName === 'IMG' || target.tagName === 'IFRAME')) {
			if (import.meta.env.DEV) {
				console.log('Image/iframe load error:', target.src);
			}
			e.preventDefault();
			return true;
		}

		// Handle third-party script errors (like Google Ads embed.js)
		if (
			e.filename &&
			(e.filename.includes('embed.js') ||
				e.filename.includes('disqus') ||
				e.filename.includes('googlesyndication') ||
				e.filename.includes('googletagmanager') ||
				e.filename.includes('adsbygoogle'))
		) {
			if (import.meta.env.DEV) {
				console.warn('Third-party script error suppressed:', e.error?.message, 'from', e.filename);
			}
			// Prevent the error from being reported to Sentry
			e.preventDefault();
			return true;
		}

		// Handle browser extension errors
		if (
			e.filename &&
			(e.filename.includes('chrome-extension://') ||
				e.filename.includes('moz-extension://') ||
				e.filename.includes('extension://') ||
				e.filename.includes('safari-extension://') ||
				e.filename.includes('edge://') ||
				e.filename.includes('chrome://'))
		) {
			if (import.meta.env.DEV) {
				console.warn('Browser extension error suppressed:', e.error?.message, 'from', e.filename);
			}
			// Prevent the error from being reported to Sentry
			e.preventDefault();
			return true;
		}
	},
	true,
);

const container = document.getElementById('root');
if (!container) {
	throw new Error('Root element not found');
}

const root = createRoot(container);

root.render(
	<StrictMode>
		<QueryProvider>
			<Router />
		</QueryProvider>
	</StrictMode>,
);
