/**
 * Check if an error is a DOM manipulation error from React/third-party conflicts.
 * These occur when third-party scripts (ads, Disqus, browser extensions) modify
 * DOM nodes that React is trying to manage.
 */
export function isDOMManipulationError(error: unknown): boolean {
	if (!error) return false;

	// Check DOMException by name or code
	if (error instanceof DOMException) {
		if (error.code === 8 || error.name === 'NotFoundError') {
			return true;
		}
	}

	// Check error message patterns
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("Failed to execute 'insertBefore'") ||
		message.includes("Failed to execute 'removeChild'") ||
		message.includes("Failed to execute 'appendChild'") ||
		message.includes('not a child of this node') ||
		message.includes('NotFoundError')
	);
}

/**
 * Check if an error is a chunk load error from stale deployments.
 * These occur when Firebase deploys a new version and old chunk files
 * are no longer available, but users have cached HTML referencing them.
 */
export function isChunkLoadError(error: unknown): boolean {
	if (!error) return false;

	const message = error instanceof Error ? error.message : String(error);
	const name = error instanceof Error ? error.name : '';

	return (
		name === 'ChunkLoadError' ||
		message.includes('Loading chunk') ||
		message.includes('Loading CSS chunk') ||
		message.includes('dynamically imported module') ||
		message.includes('Failed to fetch dynamically imported module')
	);
}
