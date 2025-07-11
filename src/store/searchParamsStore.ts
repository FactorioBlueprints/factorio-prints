import {Store} from '@tanstack/react-store';
import {z} from 'zod';

const tagSchema = z.string().refine((tag) => tag.startsWith('/') && tag.endsWith('/'), {
	message: 'Tag must have leading and trailing slashes (e.g., "/category/name/")',
});

const storeSchema = z.object({
	filteredTags: z.array(tagSchema).default([]),
	titleFilter: z.string().default(''),
});

export type SearchParamsState = z.infer<typeof storeSchema>;

export const searchParamsStore = new Store<SearchParamsState>({
	filteredTags: [],
	titleFilter: '',
});

searchParamsStore.subscribe((state) => {
	try {
		storeSchema.parse(state);
	} catch (error: unknown) {
		const zodError = error as z.ZodError;
		console.error('SearchParams validation error:', zodError.issues);
		console.error('Invalid state data:', state);
		throw new Error(`SearchParams validation failed: ${zodError.issues.map((e) => e.message).join(', ')}`);
	}
});
