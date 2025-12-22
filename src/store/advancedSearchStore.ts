import {Store} from '@tanstack/react-store';
import {z} from 'zod';

import {blueprintTypeSchema, modFilterSchema, sortOrderSchema} from '../api/rest/types';

const advancedSearchSchema = z
	.object({
		text: z.string(),
		orderBy: sortOrderSchema,
		tag: z.string().nullable(),
		entity: z.string().nullable(),
		recipe: z.string().nullable(),
		gameVersionLong: z.number().nullable(),
		blueprintType: blueprintTypeSchema.nullable(),
		mod: modFilterSchema.nullable(),
		page: z.number(),
		searchTrigger: z.number(),
	})
	.strict();

export type AdvancedSearchState = z.infer<typeof advancedSearchSchema>;

const defaultState: AdvancedSearchState = {
	text: '',
	orderBy: 'Favorites',
	tag: null,
	entity: null,
	recipe: null,
	gameVersionLong: null,
	blueprintType: null,
	mod: null,
	page: 1,
	searchTrigger: 0,
};

export const advancedSearchStore = new Store<AdvancedSearchState>(defaultState);

advancedSearchStore.subscribe(({currentVal}) => {
	try {
		advancedSearchSchema.parse(currentVal);
	} catch (error: unknown) {
		const zodError = error as z.ZodError;
		const details = zodError.issues.map((e) => `${e.path.join('.')}: ${e.message} (${e.code})`).join(', ');
		console.error('Validation failed for state:', JSON.stringify(currentVal, null, 2));
		console.error('Zod issues:', zodError.issues);
		throw new Error(`AdvancedSearch validation failed: ${details}`);
	}
});

export const resetAdvancedSearch = (): void => {
	advancedSearchStore.setState(() => defaultState);
};

export const setSearchText = (text: string): void => {
	advancedSearchStore.setState((state) => ({...state, text, page: 1}));
};

export const setOrderBy = (orderBy: AdvancedSearchState['orderBy']): void => {
	advancedSearchStore.setState((state) => ({...state, orderBy, page: 1}));
};

export const setTag = (tag: string | null): void => {
	advancedSearchStore.setState((state) => ({...state, tag, page: 1}));
};

export const setEntity = (entity: string | null): void => {
	advancedSearchStore.setState((state) => ({...state, entity, page: 1}));
};

export const setRecipe = (recipe: string | null): void => {
	advancedSearchStore.setState((state) => ({...state, recipe, page: 1}));
};

export const setGameVersion = (gameVersionLong: number | null): void => {
	advancedSearchStore.setState((state) => ({...state, gameVersionLong, page: 1}));
};

export const setBlueprintType = (blueprintType: AdvancedSearchState['blueprintType']): void => {
	advancedSearchStore.setState((state) => ({...state, blueprintType, page: 1}));
};

export const setMod = (mod: AdvancedSearchState['mod']): void => {
	advancedSearchStore.setState((state) => ({...state, mod, page: 1}));
};

export const setPage = (page: number): void => {
	advancedSearchStore.setState((state) => ({...state, page}));
};

export const submitSearch = (): void => {
	advancedSearchStore.setState((state) => ({...state, searchTrigger: state.searchTrigger + 1, page: 1}));
};
