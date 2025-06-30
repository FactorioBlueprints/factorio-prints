import type { Config } from '@tanstack/router-plugin/vite'

const config: Partial<Config> = {
	routesDirectory   : './src/routes',
	generatedRouteTree: './src/routeTree.gen.ts',
	routeFilePrefix   : '',
	disableTypes      : false,
}

export default config
