import type {ReactNode} from 'react';
import {memo} from 'react';

import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import type {RawBlueprintData} from '../../../../schemas';
import {FactorioIcon, Placeholder} from '../../../core/icons/FactorioIcon';
import {RichText} from '../../../core/text/RichText';
import {Version} from '../../../core/text/Version';

interface InfoRowProps {
	label: string;
	children: ReactNode;
	hidden?: boolean;
}

const InfoRow = ({label, children, hidden = false}: InfoRowProps) => {
	if (hidden) return null;
	return (
		<tr>
			<td>{label}</td>
			<td>{children}</td>
		</tr>
	);
};

export const BasicInfoPanelComponent = ({blueprint}: {blueprint?: RawBlueprintData}) => {
	if (!blueprint) return null;
	const wrapper = new BlueprintWrapper(blueprint as any);
	const {type, label, description, icons, version} = wrapper.getInfo();

	function getIconElement(index: number, icon?: any) {
		if (icon) {
			return (
				<FactorioIcon
					key={index}
					icon={{
						name: icon.signal.name,
						type: icon.signal.type as any,
						quality: icon.signal.quality as any,
					}}
					size="tiny"
				/>
			);
		}

		return (
			<Placeholder
				key={index}
				size={'tiny'}
			/>
		);
	}

	return (
		<Card>
			<Card.Header>Game Info</Card.Header>
			<Table
				bordered
				hover
			>
				<tbody>
					<InfoRow
						label="Type"
						hidden={!type}
					>
						<FactorioIcon
							icon={{type: 'item', name: type}}
							size={'tiny'}
						/>
						<span> </span>
						<span>{type}</span>
					</InfoRow>

					<InfoRow
						label="Label"
						hidden={!label}
					>
						<RichText text={label || ''} />
					</InfoRow>

					<InfoRow
						label="Description"
						hidden={!description}
					>
						<RichText text={description || ''} />
					</InfoRow>

					<InfoRow
						label="Icons"
						hidden={!icons?.length}
					>
						{[1, 2, 3, 4].map((index) => {
							const icon = icons?.find((icon) => icon.index === index);
							return getIconElement(index, icon);
						})}
					</InfoRow>

					<InfoRow label="Version">
						<Version number={version || 0} />
					</InfoRow>
				</tbody>
			</Table>
		</Card>
	);
};

BasicInfoPanelComponent.displayName = 'BasicInfoPanel';
export const BasicInfoPanel = memo(BasicInfoPanelComponent);
