/**
 * Utility to safely clean up any orphaned Bootstrap tooltips
 * This helps prevent React DOM errors when tooltips are left behind
 */
export const cleanupOrphanedTooltips = (): void => {
	try {
		const tooltips = document.querySelectorAll(
			'.tooltip, .bs-tooltip-top, .bs-tooltip-bottom, .bs-tooltip-start, .bs-tooltip-end',
		);

		tooltips.forEach((tooltip) => {
			try {
				if (!tooltip || !tooltip.parentNode) {
					return;
				}

				const parentExists = document.body.contains(tooltip);
				if (!parentExists) {
					return;
				}

				const rect = tooltip.getBoundingClientRect();
				const isOrphaned =
					!tooltip.classList.contains('show') ||
					(rect.width === 0 && rect.height === 0) ||
					!document.body.contains(tooltip);

				if (isOrphaned) {
					tooltip.classList.remove('show');
					(tooltip as HTMLElement).style.display = 'none';
					(tooltip as HTMLElement).style.visibility = 'hidden';
					(tooltip as HTMLElement).setAttribute('aria-hidden', 'true');

					requestAnimationFrame(() => {
						try {
							if (tooltip.parentNode && document.body.contains(tooltip)) {
								const parent = tooltip.parentNode;
								if (parent && Array.from(parent.childNodes).includes(tooltip)) {
									parent.removeChild(tooltip);
								}
							}
						} catch (error) {
							if (
								error instanceof Error &&
								!error.message.includes('insertBefore') &&
								!error.message.includes('removeChild')
							) {
								console.warn('Tooltip cleanup error:', error.message);
							}
						}
					});
				}
			} catch {}
		});
	} catch {}
};

/**
 * Setup a periodic cleanup of orphaned tooltips
 * This can help prevent accumulation of DOM nodes
 */
export const setupTooltipCleanup = (): (() => void) => {
	const intervalId = setInterval(cleanupOrphanedTooltips, 5000);

	const handleNavigation = () => {
		setTimeout(cleanupOrphanedTooltips, 100);
	};

	window.addEventListener('popstate', handleNavigation);
	window.addEventListener('hashchange', handleNavigation);

	return () => {
		clearInterval(intervalId);
		window.removeEventListener('popstate', handleNavigation);
		window.removeEventListener('hashchange', handleNavigation);
	};
};
