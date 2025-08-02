import React from 'react';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import {useBlueprintHistograms} from '../hooks/useBlueprintHistograms';
import {BlueprintWrapper} from '../parsing/BlueprintWrapper';
import type {RawBlueprintData} from '../schemas';
import {BasicInfoPanel} from './blueprint/panels/info/BasicInfoPanel';
import {ExtraInfoPanel} from './blueprint/panels/info/ExtraInfoPanel';
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
		<Row>
			<Col md={4}>
				<RequirementsCard
					blueprintWrapper={blueprintWrapper}
					entityHistogram={entityHistogram}
					itemHistogram={itemHistogram}
				/>
			</Col>
			<Col md={8}>
				<Card className="mb-3">
					<Card.Header>Blueprint Titles</Card.Header>
					<Card.Body>
						<BlueprintTitles
							blueprintKey={blueprintKey}
							parsedData={decodedBlueprint}
							isLoading={false}
						/>
					</Card.Body>
				</Card>
				<BasicInfoPanel blueprint={decodedBlueprint} />
				<div className="mt-3">
					<ExtraInfoPanel blueprint={decodedBlueprint} />
				</div>
				<div className="mt-3">
					<ParametersPanel blueprintString={decodedBlueprint} />
				</div>
			</Col>
		</Row>
	);
};

export default BlueprintPreview;
