import * as Sentry from '@sentry/react';
import React from 'react';

export const SentryDebugPanel: React.FC = () => {
	if (!import.meta.env.DEV) {
		return null;
	}

	const triggerTestError = () => {
		throw new Error('Test error from Sentry Debug Panel');
	};

	const captureTestMessage = () => {
		Sentry.captureMessage('Test message from Sentry Debug Panel', 'info');
	};

	const captureTestException = () => {
		try {
			throw new Error('Test exception for Sentry');
		} catch (error) {
			Sentry.captureException(error);
		}
	};

	const createTestTransaction = () => {
		Sentry.startSpan(
			{
				name: 'test-transaction',
				op: 'test',
			},
			() => {
				console.log('Test transaction started');
				setTimeout(() => {
					console.log('Test transaction finished');
				}, 1000);
			},
		);
	};

	const addTestBreadcrumb = () => {
		Sentry.addBreadcrumb({
			message: 'Test breadcrumb',
			level: 'debug',
			category: 'test',
			data: {
				timestamp: new Date().toISOString(),
			},
		});
		console.log('Test breadcrumb added');
	};

	return (
		<div
			style={{
				position: 'fixed',
				bottom: 20,
				right: 20,
				padding: '10px',
				backgroundColor: 'rgba(0, 0, 0, 0.8)',
				color: 'white',
				borderRadius: '8px',
				zIndex: 9999,
			}}
		>
			<h3 style={{margin: '0 0 10px 0', fontSize: '14px'}}>🐛 Sentry Debug Panel</h3>
			<div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
				<button
					onClick={captureTestMessage}
					style={{fontSize: '12px', padding: '5px'}}
				>
					Send Test Message
				</button>
				<button
					onClick={captureTestException}
					style={{fontSize: '12px', padding: '5px'}}
				>
					Capture Test Exception
				</button>
				<button
					onClick={createTestTransaction}
					style={{fontSize: '12px', padding: '5px'}}
				>
					Create Test Transaction
				</button>
				<button
					onClick={addTestBreadcrumb}
					style={{fontSize: '12px', padding: '5px'}}
				>
					Add Test Breadcrumb
				</button>
				<button
					onClick={triggerTestError}
					style={{fontSize: '12px', padding: '5px', backgroundColor: '#dc3545'}}
				>
					Trigger Uncaught Error
				</button>
			</div>
		</div>
	);
};
