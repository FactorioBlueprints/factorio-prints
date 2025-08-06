/**
 * Utility to safely clean up any orphaned Bootstrap tooltips
 * This helps prevent React DOM errors when tooltips are left behind
 */
export const cleanupOrphanedTooltips = (): void => {
	try {
		// Find all tooltip elements
		const tooltips = document.querySelectorAll(
			'.tooltip, .bs-tooltip-top, .bs-tooltip-bottom, .bs-tooltip-start, .bs-tooltip-end',
		);

		tooltips.forEach((tooltip) => {
			// Check if the tooltip is orphaned (not properly attached or visible)
			const rect = tooltip.getBoundingClientRect();
			const isOrphaned =
				!tooltip.classList.contains('show') ||
				(rect.width === 0 && rect.height === 0) ||
				!document.body.contains(tooltip);

			if (isOrphaned && tooltip.parentNode) {
				try {
					// Safely remove the tooltip
					tooltip.remove();
				} catch {
					// If direct removal fails, try parent removal
					try {
						tooltip.parentNode.removeChild(tooltip);
					} catch {
						// Silently ignore if already removed
					}
				}
			}
		});
	} catch {
		// Silently handle any errors during cleanup
	}
};

/**
 * Setup a periodic cleanup of orphaned tooltips
 * This can help prevent accumulation of DOM nodes
 */
export const setupTooltipCleanup = (): (() => void) => {
	// Run cleanup every 5 seconds
	const intervalId = setInterval(cleanupOrphanedTooltips, 5000);

	// Also cleanup on navigation events
	const handleNavigation = () => {
		setTimeout(cleanupOrphanedTooltips, 100);
	};

	window.addEventListener('popstate', handleNavigation);
	window.addEventListener('hashchange', handleNavigation);

	// Return cleanup function
	return () => {
		clearInterval(intervalId);
		window.removeEventListener('popstate', handleNavigation);
		window.removeEventListener('hashchange', handleNavigation);
	};
};
