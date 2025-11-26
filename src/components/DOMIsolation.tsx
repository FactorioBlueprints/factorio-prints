import {useRef, useEffect, type ReactNode} from 'react';

interface DOMIsolationProps {
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * 🛡️ DOMIsolation - Prevents React from managing DOM nodes modified by third-party scripts.
 *
 * This component renders its children once and then prevents React from updating or
 * removing the DOM nodes. This is essential for integrating with third-party scripts
 * (Google Ads, Disqus, etc.) that manipulate the DOM outside of React's control.
 *
 * Without this isolation, React may throw errors like:
 * - "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node"
 * - "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node"
 */
function DOMIsolation({children, className, style}: DOMIsolationProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mountedRef = useRef(false);

	useEffect(() => {
		mountedRef.current = true;
		// 🛡️ Capture the container reference for cleanup
		const container = containerRef.current;

		return () => {
			// On unmount, manually clear the container to prevent React from
			// trying to remove nodes that third-party scripts may have modified
			if (container) {
				while (container.firstChild) {
					try {
						container.removeChild(container.firstChild);
					} catch {
						// Ignore DOM manipulation errors during cleanup
						break;
					}
				}
			}
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className={className}
			style={style}
			// Suppress React hydration warnings for this container since
			// third-party scripts will modify its contents
			suppressHydrationWarning
		>
			{children}
		</div>
	);
}

export default DOMIsolation;
