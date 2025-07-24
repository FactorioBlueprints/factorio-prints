import {createFileRoute, Outlet} from '@tanstack/react-router';
import React from 'react';

export const Route = createFileRoute('/favorites')({
	component: FavoritesLayout,
});

function FavoritesLayout() {
	return <Outlet />;
}
