import {memo} from 'react';

import {RawBlueprintData} from '../../../schemas';

const BlueprintInfoPanelsComponent = ({blueprint}: {blueprint?: RawBlueprintData}) => {
	if (!blueprint) return null;
	return (
		<>
			{/* Show type-specific panels */}
			{blueprint.blueprint && <div>Contents panel placeholder</div>}
			{blueprint.upgrade_planner && <div>Upgrade planner panel placeholder</div>}
			{blueprint.deconstruction_planner && <div>Deconstruction planner panel placeholder</div>}
		</>
	);
};

BlueprintInfoPanelsComponent.displayName = 'BlueprintInfoPanels';
export const BlueprintInfoPanels = memo(BlueprintInfoPanelsComponent);
