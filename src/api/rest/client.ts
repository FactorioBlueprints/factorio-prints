import {z} from 'zod';

import {REST_API_BASE_URLS} from './config';
import {
	type AdvancedSearchParams,
	restBlueprintSummarySchema,
	restPaginatedResponseSchema,
	restTagSchema,
} from './types';

const isNetworkError = (error: unknown): boolean => {
	if (error instanceof TypeError && error.message === 'Failed to fetch') {
		return true;
	}
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes('failed to fetch') ||
			message.includes('network error') ||
			message.includes('network request failed') ||
			message.includes('fetch failed')
		);
	}
	return false;
};

const shouldFallback = (error: unknown): boolean => {
	if (isNetworkError(error)) {
		return true;
	}
	if (error instanceof Response && error.status >= 500) {
		return true;
	}
	return false;
};

const fetchWithFallback = async (path: string): Promise<Response> => {
	let lastError: unknown;

	for (const baseUrl of REST_API_BASE_URLS) {
		try {
			const response = await fetch(`${baseUrl}${path}`);
			if (response.status >= 500) {
				lastError = response;
				continue;
			}
			return response;
		} catch (error) {
			if (shouldFallback(error)) {
				lastError = error;
				continue;
			}
			throw error;
		}
	}

	if (lastError && typeof lastError === 'object' && 'status' in lastError && 'ok' in lastError) {
		return lastError as Response;
	}
	throw lastError;
};

export const searchBlueprintSummaries = async (
	params: AdvancedSearchParams,
): Promise<z.infer<typeof restPaginatedResponseSchema>> => {
	const searchParams = new URLSearchParams();

	searchParams.append('pageSize', String(params.pageSize));

	if (params.text) {
		searchParams.append('text', params.text);
	}
	if (params.orderBy) {
		searchParams.append('orderBy', params.orderBy);
	}
	if (params.tag) {
		searchParams.append('tag', params.tag);
	}
	if (params.entity) {
		searchParams.append('entity', params.entity);
	}
	if (params.recipe) {
		searchParams.append('recipe', params.recipe);
	}
	if (params.gameVersionLong) {
		searchParams.append('gameVersionLong', String(params.gameVersionLong));
	}
	if (params.blueprintType) {
		searchParams.append('blueprintType', params.blueprintType);
	}
	if (params.mod) {
		searchParams.append('mod', params.mod);
	}

	const path = `/api/blueprintSummaries/search/page/${params.page}?${searchParams.toString()}`;
	const response = await fetchWithFallback(path);
	if (!response.ok) {
		throw new Error(`Search failed: ${response.status} ${response.statusText}`);
	}

	const data: unknown = await response.json();
	return restPaginatedResponseSchema.parse(data);
};

export const fetchEntities = async (): Promise<string[]> => {
	const response = await fetchWithFallback('/api/entities/');
	if (!response.ok) {
		throw new Error(`Failed to fetch entities: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(z.string()).parse(data);
};

export const fetchRecipes = async (): Promise<string[]> => {
	const response = await fetchWithFallback('/api/recipes/');
	if (!response.ok) {
		throw new Error(`Failed to fetch recipes: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(z.string()).parse(data);
};

export const fetchRestTags = async (): Promise<z.infer<typeof restTagSchema>[]> => {
	const response = await fetchWithFallback('/api/tags/');
	if (!response.ok) {
		throw new Error(`Failed to fetch tags: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(restTagSchema).parse(data);
};

export const fetchDuplicates = async (): Promise<z.infer<typeof restBlueprintSummarySchema>[]> => {
	const response = await fetchWithFallback('/api/duplicates/');
	if (!response.ok) {
		throw new Error(`Failed to fetch duplicates: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(restBlueprintSummarySchema).parse(data);
};
