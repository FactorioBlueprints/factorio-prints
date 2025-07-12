import {memo, type ReactNode} from 'react';

import {RawBlueprintData} from '../../../schemas';
import {Panel} from '../../ui';

import {buildNode, isNodeActive} from './treeUtils';
import {TreeNode} from './types';

interface BlueprintTreeProps {
	rootBlueprint?: RawBlueprintData;
	selectedPath: string;
	onSelect: (path: string) => void;
}

const BlueprintTreeComponent = ({rootBlueprint, selectedPath, onSelect}: BlueprintTreeProps) => {
	if (!rootBlueprint) return null;

	const tree = buildNode(rootBlueprint, '');

	function renderNode(node: TreeNode, level: number, parent?: TreeNode): ReactNode[] {
		const rows: ReactNode[] = [];

		const active = isNodeActive(node, parent);
		const isSelected = selectedPath === node.path;

		// Get label from the blueprint
		let label = 'Untitled';
		if (node.blueprint.blueprint?.label) {
			label = node.blueprint.blueprint.label;
		} else if (node.blueprint.blueprint_book?.label) {
			label = node.blueprint.blueprint_book.label;
		} else if (node.blueprint.upgrade_planner?.label) {
			label = node.blueprint.upgrade_planner.label;
		} else if (node.blueprint.deconstruction_planner?.label) {
			label = node.blueprint.deconstruction_planner.label;
		}

		rows.push(
			<div
				key={node.path}
				style={{
					paddingLeft: `${level * 20}px`,
					cursor: 'pointer',
					backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
					fontWeight: active ? 'bold' : 'normal',
				}}
				onClick={() => onSelect(node.path)}
			>
				{label}
			</div>,
		);

		node.children.forEach((child) => {
			rows.push(...renderNode(child, level + 1, node));
		});

		return rows;
	}

	return (
		<Panel title="Blueprint Tree">
			<div className="blueprint-tree">{renderNode(tree, 0)}</div>
		</Panel>
	);
};

BlueprintTreeComponent.displayName = 'BlueprintTree';
export const BlueprintTree = memo(BlueprintTreeComponent);
