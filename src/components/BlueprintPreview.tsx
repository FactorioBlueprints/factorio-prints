import React from 'react';
import Card from 'react-bootstrap/Card';
import {useBlueprintHistograms} from '../hooks/useBlueprintHistograms';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import type {RawBlueprintData} from '../schemas';
import {BasicInfoPanel} from './blueprint/panels/info/BasicInfoPanel';
import {ParametersPanel} from './blueprint/panels/parameters/ParametersPanel';
import {RequirementsCard} from './single/RequirementsCard';
import BlueprintTitles from './single/BlueprintTitles';

interface BlueprintPreviewProps {
	blueprintWrapper: BlueprintWrapper | null;
	decodedBlueprint: RawBlueprintData | null;
	blueprintKey?: string;
}

export const BlueprintPreview: React.FC<BlueprintPreviewProps> = ({
	blueprintWrapper,
	decodedBlueprint,
	blueprintKey = 'preview',
}) => {
	const {entityHistogram, itemHistogram} = useBlueprintHistograms(decodedBlueprint);

	if (!blueprintWrapper || !decodedBlueprint) {
		return null;
	}

	return (
		<div>
			<BasicInfoPanel blueprint={decodedBlueprint} />
			<Card className="mt-3">
				<Card.Header>Blueprint Titles</Card.Header>
				<Card.Body>
					<BlueprintTitles
						blueprintKey={blueprintKey}
						parsedData={decodedBlueprint}
						isLoading={false}
					/>
				</Card.Body>
			</Card>
			<div className="mt-3">
				<RequirementsCard
					blueprintWrapper={blueprintWrapper}
					entityHistogram={entityHistogram}
					itemHistogram={itemHistogram}
				/>
			</div>
			<div className="mt-3">
				<ParametersPanel blueprintString={decodedBlueprint} />
			</div>
		</div>
	);
};

export default BlueprintPreview;
