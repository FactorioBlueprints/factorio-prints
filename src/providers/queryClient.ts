import {QueryCache, QueryClient} from '@tanstack/react-query';

const queryCache = new QueryCache({
	onSuccess: (data: any, query) => {
		if (query.queryKey[0] === 'rawPaginatedBlueprintSummaries' && data?.pages) {
			data.pages.forEach((page: any) => {
				Object.entries(page.data).forEach(([blueprintId, summary]) => {
					queryClient.setQueryData(['blueprintSummaries', 'blueprintId', blueprintId], summary);
				});
			});
		}
	},
	onError: (error: any) => {
		// Network errors should be handled at source, skip logging them
		if (error instanceof TypeError && error.message === 'Failed to fetch') {
			return;
		}
		// Log other errors in development only
		if (import.meta.env.DEV) {
			console.error('Query error:', error);
		}
	},
});

export const queryClient = new QueryClient({
	queryCache,
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 60,
			refetchOnWindowFocus: true,
			refetchOnMount: true,
			retry: 1,
			gcTime: Infinity,
		},
		mutations: {
			retry: 1,
		},
	},
});
