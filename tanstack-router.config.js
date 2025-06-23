import { defineConfig } from '@tanstack/router-cli'

export default defineConfig({
	routesDirectory   : './src/routes',
	generatedRouteTree: './src/routeTree.gen.ts',
	extensions        : ['.js', '.jsx', '.ts', '.tsx'],
	routeFilePrefix   : '',
	language          : 'ts',
	disableTypes      : false,
})
