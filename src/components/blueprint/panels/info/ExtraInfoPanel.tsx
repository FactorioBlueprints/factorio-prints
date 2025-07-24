import range from 'lodash/range';
import type {ReactNode} from 'react';
import {memo} from 'react';

import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';

import {BlueprintWrapper} from '../../../../parsing/BlueprintWrapper';
import type {BlueprintBookEntry, RawBlueprintData} from '../../../../schemas';
import {FactorioIcon} from '../../../core/icons/FactorioIcon';
import {RichText} from '../../../core/text/RichText';

interface ExtraInfoPanelProps {
	blueprint?: RawBlueprintData;
}

const getBookEntry = (entry: BlueprintBookEntry): RawBlueprintData | null => {
	if (entry.blueprint) return {blueprint: entry.blueprint};
	if (entry.blueprint_book) return {blueprint_book: entry.blueprint_book};
	if (entry.upgrade_planner) return {upgrade_planner: entry.upgrade_planner};
	if (entry.deconstruction_planner) return {deconstruction_planner: entry.deconstruction_planner};
	return null;
};

export const ExtraInfoPanelComponent = ({blueprint}: ExtraInfoPanelProps) => {
	if (!blueprint) return null;

	const wrapper = new BlueprintWrapper(blueprint);
	const type = wrapper.getType();

	if (type === 'blueprint') {
		const {label: _label, icons} = wrapper.getInfo();

		return (
			<Card>
				<Card.Header>Extra Info</Card.Header>
				<Table
					bordered
					hover
				>
					<colgroup>
						<col
							span={1}
							style={{width: '1%'}}
						/>
						<col span={1} />
					</colgroup>
					<tbody>
						{icons &&
							icons.length > 0 &&
							icons.map((icon, index) => (
								<tr key={icon.index || index}>
									<td className={`icon icon-${icon.signal.name}`}>
										<FactorioIcon
											icon={{
												name: icon.signal.name,
												type: icon.signal.type as any,
												quality: icon.signal.quality as any,
											}}
											size="small"
										/>
									</td>
									<td>
										<RichText text={icon.signal.name} />
									</td>
								</tr>
							))}
					</tbody>
				</Table>
			</Card>
		);
	}

	if (type === 'blueprint-book') {
		const book = blueprint.blueprint_book;

		if (!book || !book.blueprints) return null;

		return (
			<Card>
				<Card.Header>Extra Info</Card.Header>
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
						{book.blueprints.map((entry, entryIndex) => {
							const entryData = getBookEntry(entry);
							if (!entryData) {
								return (
									<tr key={entryIndex}>
										<td colSpan={4}></td>
										<td>Empty slot in book</td>
									</tr>
								);
							}

							const entryWrapper = new BlueprintWrapper(entryData);
							const entryInfo = entryWrapper.getInfo();
							const entryIcons = entryInfo.icons || [];

							// Create an array of 4 icon slots
							const iconSlots = range(4).map((slotIndex) => {
								const icon = entryIcons.find((icon) => icon.index === slotIndex + 1);
								return icon ? (
									<FactorioIcon
										key={slotIndex}
										icon={{
											name: icon.signal.name,
											type: icon.signal.type as any,
											quality: icon.signal.quality as any,
										}}
										size="small"
									/>
								) : null;
							});

							return (
								<tr key={entryIndex}>
									{iconSlots.map((iconSlot, slotIndex) => (
										<td
											key={slotIndex}
											className={
												iconSlot
													? `icon icon-${entryIcons.find((icon) => icon.index === slotIndex + 1)?.signal.name}`
													: ''
											}
										>
											{iconSlot}
										</td>
									))}
									<td>
										<RichText text={entryInfo.label || 'No label'} />
									</td>
								</tr>
							);
						})}
					</tbody>
				</Table>
			</Card>
		);
	}

	return null;
};

ExtraInfoPanelComponent.displayName = 'ExtraInfoPanel';
export const ExtraInfoPanel = memo(ExtraInfoPanelComponent);
