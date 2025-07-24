import {createFileRoute} from '@tanstack/react-router';
import React from 'react';
import Account from '../components/Account';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/account')({
	component: AccountComponent,
});

function AccountComponent() {
	return (
		<ErrorBoundary>
			<Account />
		</ErrorBoundary>
	);
}
