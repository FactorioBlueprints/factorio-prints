import * as Sentry from '@sentry/react';
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import './css/style.css';
import QueryProvider from './providers/QueryProvider';
import {Router} from './router';
import {getReleaseInfo, getReleaseMetadata} from './utils/release';
import {setupTooltipCleanup} from './utils/cleanupTooltips';

const releaseInfo = getReleaseInfo();

function getSentryEnvironment(): string {
	const hostname = window.location.hostname;

	// Local development
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return 'development';
	}

	// Production
	if (hostname === 'factorioprints.com' || hostname === 'www.factorioprints.com') {
		return 'production';
	}

	// Cloudflare Pages preview deployments (staging)
	if (hostname.includes('.pages.dev') || hostname.includes('cloudflare')) {
		return 'staging';
	}

	// Default to staging for any other hostnames
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
	allowUrls: ['http://localhost', 'https://localhost', /localhost:\d{4}/, 'https://factorioprints.com'],
	enabled: !(window.location.hostname === 'localhost' && window.location.port === '3000'),
	// Set maxBreadcrumbs to capture more console logs
	maxBreadcrumbs: 100,
	// Attach stack traces to messages
	attachStacktrace: true,
	beforeSend: (event, hint) => {
		const error = hint.originalException;

		// Filter out third-party errors (Disqus, ads, etc.)
		if (error && error instanceof Error) {
			if (error.stack && (error.stack.includes('embed.js') || error.stack.includes('disqus'))) {
				return null;
			}
		}

		// Last-resort filter for any network errors that weren't caught earlier
		if (error && error instanceof TypeError && error.message === 'Failed to fetch') {
			return null;
		}

		// Filter out cross-origin errors
		if (error && error instanceof Error && error.message) {
			if (
				error.message.includes("Cannot get CSS styles from text's parentNode") ||
				error.message.includes('SecurityError') ||
				error.message.includes('cross-origin') ||
				error.message.includes('Blocked a frame with origin')
			) {
				return null;
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
		// Filter out cross-origin CSS warnings from console breadcrumbs
		if (breadcrumb.category === 'console' && breadcrumb.message) {
			const message = breadcrumb.message;
			if (
				message.includes("Cannot get CSS styles from text's parentNode") ||
				message.includes('CSSStyleSheet.cssRules getter') ||
				message.includes('cross-origin stylesheet') ||
				message.includes('Blocked a frame with origin') ||
				message.includes('SecurityError')
			) {
				return null; // Don't create breadcrumb for cross-origin CSS warnings
			}
		}
		return breadcrumb;
	},
});

// Set release metadata as context
Sentry.setContext('release_metadata', getReleaseMetadata());

// Set global Sentry scope with environment context
Sentry.setTag('environment', getSentryEnvironment());
Sentry.setContext('deployment', {
	hostname: window.location.hostname,
	environment: getSentryEnvironment(),
});

// Set git commit as a tag for easier filtering
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
		if (target && (target.tagName === 'IMG' || target.tagName === 'IFRAME')) {
			if (import.meta.env.DEV) {
				console.log('Image/iframe load error:', target.src);
			}
			e.preventDefault();
			return true;
		}

		// Handle SecurityError for cross-origin iframe access
		if (
			e.error &&
			e.error instanceof Error &&
			e.error.message &&
			(e.error.message.includes('Blocked a frame with origin') ||
				e.error.message.includes('SecurityError: Blocked a frame'))
		) {
			if (import.meta.env.DEV) {
				console.warn('Cross-origin iframe error suppressed:', e.error.message);
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
			e.preventDefault();
			return true;
		}

		return false;
	},
	true,
);

// Setup tooltip cleanup to prevent DOM manipulation issues
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
