import React from 'react';
import {Outlet, createFileRoute} from '@tanstack/react-router';

export const Route = createFileRoute('/favorites')({
	component: FavoritesLayout,
});

function FavoritesLayout() {
	return <Outlet />;
}
