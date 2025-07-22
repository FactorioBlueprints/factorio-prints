import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import entitiesWithIcons from '../../data/entitiesWithIcons';
import type {BlueprintWrapper} from '../../parsing/BlueprintWrapper';
import type {RawBlueprintData} from '../../schemas';
import {FactorioIcon} from '../core/icons/FactorioIcon';

interface UpgradePlannerCardProps {
	blueprintWrapper: BlueprintWrapper | null;
	parsedData?: RawBlueprintData;
}

export function UpgradePlannerCard({blueprintWrapper, parsedData}: UpgradePlannerCardProps) {
	if (!blueprintWrapper || blueprintWrapper.getType() !== 'upgrade-planner' || !parsedData) {
		return null;
	}

	const mappers = (parsedData.upgrade_planner?.settings as any)?.mappers;
	if (!mappers) {
		return null;
	}

	return (
		<Card>
			<Card.Header>Upgrade Planner</Card.Header>
			<Table
				bordered
				hover
			>
				<colgroup>
					<col
						span={1}
						style={{width: '1%'}}
					/>
					<col
						span={1}
						style={{width: '1%'}}
					/>
					<col span={1} />
				</colgroup>
				<tbody>
					{mappers.map(({from, to, index}: any) => (
						<tr key={index}>
							<td className={`icon icon-${from.name}`}>
								{(entitiesWithIcons as any)[from.name] ? (
									<FactorioIcon
										icon={{
											name: from.name,
											type: from.type || 'item',
											quality: from.quality,
										}}
										size="small"
									/>
								) : (
									''
								)}
							</td>
							<td className={`icon icon-${to.name}`}>
								{(entitiesWithIcons as any)[to.name] ? (
									<FactorioIcon
										icon={{
											name: to.name,
											type: to.type || 'item',
											quality: to.quality,
										}}
										size="small"
									/>
								) : (
									''
								)}
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</Card>
	);
}
