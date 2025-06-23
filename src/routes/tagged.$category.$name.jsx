import { createFileRoute } from '@tanstack/react-router';
import React, {useEffect}    from 'react';
import BlueprintGrid         from '../components/BlueprintGrid';
import ErrorBoundary         from '../components/ErrorBoundary';
import {searchParamsStore}   from '../store/searchParamsStore';

export const Route = createFileRoute('/tagged/$category/$name')({
	component: TaggedRouteComponent,
});

function TaggedRouteComponent()
{
	const {category, name} = Route.useParams();

	useEffect(() =>
	{
		// Throw if category or name is undefined
		if (category === undefined || name === undefined)
		{
			console.error('Category or name is undefined in tagged route', { category, name });
			throw new Error('Category or name is undefined in tagged route component');
		}

		const tagWithSlashes = `/${category}/${name}/`;

		searchParamsStore.setState(state => ({
			...state,
			filteredTags: [tagWithSlashes],
			titleFilter : '',
		}));
	}, [category, name]);

	return (
		<ErrorBoundary>
			<BlueprintGrid />
		</ErrorBoundary>
	);
}
