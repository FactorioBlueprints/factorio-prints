import {RawBlueprintData} from '../../../schemas';

import {TreeNode} from './types';

/**
 * Determines if a node is active based on its parent's active_index.
 *
 * @param node - The node to check for active status
 * @param parentNode - Optional parent node containing active_index
 * @returns boolean indicating if the node is active
 */
export function isNodeActive(node: TreeNode, parentNode?: TreeNode): boolean {
	const activeIndex = parentNode?.blueprint.blueprint_book?.active_index;
	if (!activeIndex) {
		return false;
	}

	const nodeIndex = parentNode.children.findIndex((child) => child.path === node.path);

	return nodeIndex === activeIndex;
}

/**
 * Builds a tree structure from a blueprint string.
 * Recursively processes blueprint books to create a navigable hierarchy.
 *
 * @param blueprint - Source blueprint data
 * @param path - Current path in the tree
 * @returns Constructed TreeNode
 */
export function buildNode(blueprint: RawBlueprintData, path: string): TreeNode {
	const children =
		blueprint.blueprint_book?.blueprints?.map((child: any, index: number) => {
			const childPath = path ? `${path}.${index + 1}` : `${index + 1}`;
			return buildNode(child, childPath);
		}) ?? [];

	return {
		path,
		blueprint,
		children,
	};
}

/**
 * Finds a node in the tree by its path.
 *
 * @param root - Root node of the tree
 * @param path - Path to search for
 * @returns Found node or undefined
 */
export function findNodeByPath(root: TreeNode, path: string): TreeNode | undefined {
	if (root.path === path) {
		return root;
	}

	for (const child of root.children) {
		const found = findNodeByPath(child, path);
		if (found) {
			return found;
		}
	}

	return undefined;
}
