import {z} from 'zod';

import {REST_API_BASE_URL} from './config';
import {
	type AdvancedSearchParams,
	restBlueprintSummarySchema,
	restPaginatedResponseSchema,
	restTagSchema,
} from './types';

export const searchBlueprintSummaries = async (
	params: AdvancedSearchParams,
): Promise<z.infer<typeof restPaginatedResponseSchema>> => {
	const url = new URL(`${REST_API_BASE_URL}/api/blueprintSummaries/search/page/${params.page}`);
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

	url.search = searchParams.toString();

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Search failed: ${response.status} ${response.statusText}`);
	}

	const data: unknown = await response.json();
	return restPaginatedResponseSchema.parse(data);
};

export const fetchEntities = async (): Promise<string[]> => {
	const response = await fetch(`${REST_API_BASE_URL}/api/entities/`);
	if (!response.ok) {
		throw new Error(`Failed to fetch entities: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(z.string()).parse(data);
};

export const fetchRecipes = async (): Promise<string[]> => {
	const response = await fetch(`${REST_API_BASE_URL}/api/recipes/`);
	if (!response.ok) {
		throw new Error(`Failed to fetch recipes: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(z.string()).parse(data);
};

export const fetchRestTags = async (): Promise<z.infer<typeof restTagSchema>[]> => {
	const response = await fetch(`${REST_API_BASE_URL}/api/tags/`);
	if (!response.ok) {
		throw new Error(`Failed to fetch tags: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(restTagSchema).parse(data);
};

export const fetchDuplicates = async (): Promise<z.infer<typeof restBlueprintSummarySchema>[]> => {
	const response = await fetch(`${REST_API_BASE_URL}/api/duplicates/`);
	if (!response.ok) {
		throw new Error(`Failed to fetch duplicates: ${response.status} ${response.statusText}`);
	}
	const data: unknown = await response.json();
	return z.array(restBlueprintSummarySchema).parse(data);
};
