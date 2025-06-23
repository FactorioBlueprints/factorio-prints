import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import Account from '../components/Account';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createFileRoute('/account')({
	component: AccountComponent,
});

function AccountComponent()
{
	return (
		<ErrorBoundary>
			<Account />
		</ErrorBoundary>
	);
}
