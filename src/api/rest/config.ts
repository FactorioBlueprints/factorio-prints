export const REST_API_BASE_URLS = [
	import.meta.env.VITE_REST_API_URL || 'https://www.factorioprints.xyz',
	'https://www.factorio.school',
] as const;
