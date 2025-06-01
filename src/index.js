import React        from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from '@sentry/react';
import Root         from './components/Root';

import './css/style.css';

import reportWebVitals from './reportWebVitals';

Sentry.init({
	dsn: 'https://fa524dc2921181e29c183ca96949a681@o4509417677914112.ingest.us.sentry.io/4509423655911424',
	sendDefaultPii: true,
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration()
	],
	tracesSampleRate: 1.0,
	tracePropagationTargets: ['localhost', /^https:\/\/factorioprints\.com/],
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0
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
