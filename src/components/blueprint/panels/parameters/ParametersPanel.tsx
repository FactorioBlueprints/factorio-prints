import {memo} from 'react';

import type {RawBlueprintData} from '../../../../schemas';
import {Panel} from '../../../ui';

const ParametersPanelComponent = ({blueprintString}: {blueprintString?: RawBlueprintData}) => {
	if (!blueprintString?.blueprint?.parameters?.length) return null;

	return (
		<Panel title="Parameters">
			<div className="panel-hole">
				<ul>
					{blueprintString.blueprint.parameters.map((param: any, index: number) => (
						<li key={index}>
							{param.name} ({param.type})
						</li>
					))}
				</ul>
			</div>
		</Panel>
	);
};

ParametersPanelComponent.displayName = 'ParametersPanel';
export const ParametersPanel = memo(ParametersPanelComponent);
