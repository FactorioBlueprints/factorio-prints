import type {Config} from '@tanstack/router-vite-plugin';

const config: Partial<Config> = {
	routesDirectory: './src/routes',
	generatedRouteTree: './src/routeTree.gen.ts',
	routeFilePrefix: '',
	disableTypes: false,
};

export default config;
