import * as Sentry from '@sentry/react';
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import './css/style.css';
import QueryProvider from './providers/QueryProvider';
import {Router} from './router';
import {getReleaseInfo, getReleaseMetadata} from './utils/release';
import {setupTooltipCleanup} from './utils/cleanupTooltips';
import {suppressGoogleAuthDeprecationWarning} from './utils/suppressGoogleAuthWarning';

suppressGoogleAuthDeprecationWarning();

const releaseInfo = getReleaseInfo();

/**
 * Normalizes unknown exceptions into proper Error objects with meaningful messages.
 * This ensures Sentry captures useful error information instead of '<unknown>'.
 */
function normalizeException(exception: unknown): Error {
	if (exception instanceof Error) {
		return exception;
	}
	if (typeof exception === 'string') {
		return new Error(exception);
	}
	if (exception === null) {
		return new Error('Null exception thrown');
	}
	if (exception === undefined) {
		return new Error('Undefined exception thrown');
	}
	if (typeof exception === 'object') {
		const message = (exception as {message?: string}).message;
		if (typeof message === 'string') {
			const error = new Error(message);
			Object.assign(error, exception);
			return error;
		}
		try {
			return new Error(`Non-Error object thrown: ${JSON.stringify(exception)}`);
		} catch {
			return new Error(`Non-Error object thrown: ${Object.prototype.toString.call(exception)}`);
		}
	}
	return new Error(`Unknown exception type: ${typeof exception}`);
}

/**
 * Checks if an error message matches known unactionable error patterns.
 * These are errors caused by browser extensions, third-party scripts, or unavoidable browser behaviors.
 */
function isUnactionableError(message: string): boolean {
	const unactionablePatterns = [
		// DOM manipulation errors (browser extensions interfering with React)
		"Failed to execute 'insertBefore'",
		"Failed to execute 'removeChild'",
		"Failed to execute 'appendChild'",
		'NotFoundError',
		'The node to be removed is not a child',
		'The node before which the new node is to be inserted',
		'not a child of this node',

		// Cross-origin and security errors
		"Cannot get CSS styles from text's parentNode",
		'SecurityError',
		'cross-origin',
		'Blocked a frame with origin',

		// Mobile browser bridge errors
		'Java bridge',
		'Java object',
		'Method not found',

		// IndexedDB and Firebase persistence errors
		'[IndexedDB] Persistence operation did not succeed',
		'@firebase/app: Firebase: Error thrown when',
		'IDBDatabase',
		'database connection is closing',
		'app/idb-',
		'Connection to Indexed Database server lost',
		'Internal error opening backing store',
		'IndexedDB connection closing',

		// Network errors (transient)
		'auth/network-request-failed',

		// Chunk loading errors (stale cache after deployment)
		'Loading chunk',
		'ChunkLoadError',

		// Firebase Realtime Database internal transport error
		'scriptTagHolder is null',
	];

	return unactionablePatterns.some((pattern) => message.includes(pattern));
}

function getSentryEnvironment(): string {
	const hostname = window.location.hostname;

	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return 'development';
	}

	if (hostname === 'factorioprints.com' || hostname === 'www.factorioprints.com') {
		return 'production';
	}

	if (hostname.includes('.pages.dev') || hostname.includes('cloudflare')) {
		return 'staging';
	}

	return 'staging';
}

Sentry.init({
	dsn: 'https://1935b5b4cd539c3dc42578938c900979@o4509417677914112.ingest.us.sentry.io/4509417682632704',
	sendDefaultPii: true,
	release: releaseInfo.version,
	environment: getSentryEnvironment(),
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
			beforeAddRecordingEvent: (event) => {
				// Filter out cross-origin CSS error console logs from replay recordings
				if (event.data?.tag === 'breadcrumb' && event.data?.payload?.category === 'console') {
					const message = event.data?.payload?.message;
					if (message && typeof message === 'string') {
						if (
							message.includes("Cannot get CSS styles from text's parentNode") ||
							message.includes('CSSStyleSheet.cssRules getter') ||
							message.includes('cross-origin stylesheet') ||
							message.includes('SecurityError')
						) {
							return null;
						}
					}
				}
				return event;
			},
		}),
		Sentry.captureConsoleIntegration({
			levels: ['error', 'warn'],
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
		Sentry.feedbackIntegration({
			colorScheme: 'system',
			enableScreenshot: true,
		}),
	],
	tracesSampleRate: 1.0,
	tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
	allowUrls: ['http://localhost', 'https://localhost', /localhost:\d{4}/, /https:\/\/.*factorio/],
	denyUrls: [
		// Third-party scripts that generate noise
		/googlesyndication\.com/,
		/googletagmanager\.com/,
		/pagead2\.googlesyndication\.com/,
		/disqus\.com/,
		/embed\.js/,
		// Browser extensions
		/chrome-extension:\/\//,
		/moz-extension:\/\//,
		/safari-extension:\/\//,
		/edge:\/\//,
	],
	enabled: !(window.location.hostname === 'localhost' && window.location.port === '3000'),
	maxBreadcrumbs: 100,
	attachStacktrace: true,
	beforeSend: (event, hint) => {
		let error = hint.originalException;

		// 🔄 Normalize non-Error exceptions to proper Error objects
		if (error !== undefined && error !== null && !(error instanceof Error)) {
			const normalizedError = normalizeException(error);
			hint.originalException = normalizedError;
			error = normalizedError;

			// Update the event with the normalized message
			if (!event.message) {
				event.message = normalizedError.message;
			}
		}

		// 🛡️ Filter React DOM manipulation errors caused by third-party scripts (ads, Disqus)
		// These errors occur when third-party scripts modify DOM nodes that React is managing.
		// DOMException with code 8 (NOT_FOUND_ERR) or name 'NotFoundError' indicates this issue.
		if (error instanceof DOMException) {
			if (
				error.code === 8 ||
				error.name === 'NotFoundError' ||
				error.message.includes('removeChild') ||
				error.message.includes('insertBefore') ||
				error.message.includes('appendChild')
			) {
				return null;
			}
		}

		// 🛡️ Also check event exception values for DOMException patterns
		const exceptionValue = event.exception?.values?.[0];
		if (exceptionValue) {
			const exceptionType = exceptionValue.type;
			const exceptionMessage = exceptionValue.value || '';

			if (
				exceptionType === 'NotFoundError' ||
				exceptionType === 'DOMException' ||
				exceptionType === 'IndexedDBConnectionError' ||
				exceptionMessage.includes('removeChild') ||
				exceptionMessage.includes('insertBefore') ||
				exceptionMessage.includes('appendChild') ||
				exceptionMessage.includes('not a child of this node')
			) {
				return null;
			}
		}

		// 🔇 Filter unactionable errors using centralized pattern matching
		const errorMessage = error instanceof Error ? error.message : event.message;
		if (errorMessage && typeof errorMessage === 'string') {
			if (isUnactionableError(errorMessage)) {
				Sentry.addBreadcrumb({
					message: 'Unactionable error filtered',
					category: 'filter',
					level: 'info',
					data: {
						errorMessage: errorMessage.slice(0, 200),
						environment: getSentryEnvironment(),
					},
				});
				return null;
			}

			// Filter IndexedDB errors with detailed breadcrumb
			if (errorMessage.startsWith('[IndexedDB')) {
				Sentry.addBreadcrumb({
					message: 'IndexedDB issue filtered',
					category: 'indexeddb',
					level: 'info',
					data: {
						type: errorMessage.includes('Worker') ? 'worker' : 'persistence',
						browser:
							/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
								? 'safari'
								: 'other',
						environment: getSentryEnvironment(),
					},
				});
				return null;
			}
		}

		// 🔇 Filter errors from third-party scripts
		if (error instanceof Error && error.stack) {
			if (error.stack.includes('embed.js') || error.stack.includes('disqus')) {
				return null;
			}
		}

		// 🔇 Filter transient network errors
		if (error instanceof TypeError && error.message === 'Failed to fetch') {
			return null;
		}

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
			const hasPasswordManagerFrame = frames.some(
				(frame) =>
					frame.function &&
					(frame.function.includes('scanForForms') ||
						frame.function.includes('fillForm') ||
						frame.function.includes('autofill')),
			);
			if (hasExtensionFrame || hasPasswordManagerFrame) {
				return null;
			}
		}

		if (import.meta.env.DEV) {
			console.log('Sentry Error:', hint.originalException || hint.syntheticException);
		}
		return event;
	},
	beforeBreadcrumb: (breadcrumb) => {
		if (breadcrumb.category === 'console' && breadcrumb.message) {
			const message = breadcrumb.message;

			// 🔇 Filter noisy console messages using centralized pattern matching
			if (message.startsWith('[IndexedDB') || isUnactionableError(message)) {
				return null;
			}

			// Additional console-specific patterns
			if (message.includes('CSSStyleSheet.cssRules getter') || message.includes('cross-origin stylesheet')) {
				return null;
			}
		}
		return breadcrumb;
	},
});

Sentry.setContext('release_metadata', getReleaseMetadata());

Sentry.setTag('environment', getSentryEnvironment());
Sentry.setContext('deployment', {
	hostname: window.location.hostname,
	environment: getSentryEnvironment(),
});

Sentry.setTag('git_commit', releaseInfo.gitCommit);
Sentry.setTag('git_branch', releaseInfo.gitBranch);

window.addEventListener('vite:preloadError', (event) => {
	console.error('Vite preload error detected, reloading page...', event.payload);
	Sentry.captureException(event.payload, {
		tags: {
			error_type: 'vite_preload_error',
			environment: getSentryEnvironment(),
		},
		extra: {
			message: 'Module import failed during preload',
			hostname: window.location.hostname,
		},
	});
	event.preventDefault();
	window.location.reload();
});

window.addEventListener(
	'error',
	(e: ErrorEvent) => {
		const target = e.target as HTMLImageElement | HTMLIFrameElement | null;

		// 🖼️ Suppress image/iframe load errors
		if (target && (target.tagName === 'IMG' || target.tagName === 'IFRAME')) {
			if (import.meta.env.DEV) {
				console.log('Image/iframe load error:', target.src);
			}
			e.preventDefault();
			return true;
		}

		// 📦 Handle ChunkLoadError with automatic reload
		if (e.error?.name === 'ChunkLoadError' || e.message?.includes('Loading chunk')) {
			console.warn('Chunk load error detected, page may need reload:', e.message);
			Sentry.addBreadcrumb({
				message: 'ChunkLoadError detected - likely stale cache',
				category: 'chunk',
				level: 'warning',
				data: {
					errorMessage: e.message,
					filename: e.filename,
				},
			});
			e.preventDefault();
			return true;
		}

		// 🔇 Filter unactionable errors using centralized pattern matching
		if (e.error instanceof Error && e.error.message && isUnactionableError(e.error.message)) {
			if (import.meta.env.DEV) {
				console.warn('Unactionable error suppressed:', e.error.message);
			}
			e.preventDefault();
			return true;
		}

		// 🔇 Filter third-party script errors
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
			e.preventDefault();
			return true;
		}

		// 🔇 Filter browser extension errors
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
			e.preventDefault();
			return true;
		}

		return false;
	},
	true,
);

setupTooltipCleanup();

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
