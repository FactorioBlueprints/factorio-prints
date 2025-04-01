import { defineConfig } from '@tanstack/router-cli'

export default defineConfig({
	routesDirectory   : './src/routes',
	generatedRouteTree: './src/routeTree.gen.js',
	extensions        : ['.js', '.jsx', '.ts', '.tsx'],
	routeFilePrefix   : '',
	language          : 'js',
	disableTypes      : true,
})
