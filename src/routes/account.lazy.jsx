import React from 'react';
import { createLazyFileRoute } from '@tanstack/react-router';
import Account from '../components/Account';
import ErrorBoundary from '../components/ErrorBoundary';

export const Route = createLazyFileRoute('/account')({
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
