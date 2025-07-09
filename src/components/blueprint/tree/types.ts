import {RawBlueprintData} from '../../../schemas';

export interface TreeNode {
	path: string;
	blueprint: RawBlueprintData;
	children: TreeNode[];
}
