import React from 'react';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import {FactorioIcon, Placeholder} from '../core/icons/FactorioIcon';
import type {
	RawBlueprintData,
	BlueprintBook,
	BlueprintContent,
	UpgradePlanner,
	DeconstructionPlanner,
	BlueprintIcon,
} from '../../schemas';

interface BlueprintContentHeaderProps {
	data: RawBlueprintData;
	blueprintKey: string;
	positionArray?: number[];
}

function getBlueprintBook(data: BlueprintBook, blueprintKey: string, positionArray: number[]): React.ReactElement {
	const firstRow = getFirstRow(data);

	const {blueprints = [], active_index} = data;

	return (
		<>
			{firstRow}
			<Card>
				<ListGroup variant="flush">
					{blueprints.map((each, index) => (
						<ListGroup.Item
							key={index}
							active={index === active_index}
						>
							<BlueprintContentHeader
								data={each}
								blueprintKey={blueprintKey}
								positionArray={[...positionArray, index]}
							/>
						</ListGroup.Item>
					))}
				</ListGroup>
			</Card>
		</>
	);
}

function getBlueprint(data: BlueprintContent | UpgradePlanner | DeconstructionPlanner): React.ReactElement {
	const {icons, item, label} = data;

	return (
		<>
			{item && (
				<>
					<FactorioIcon
						type="item"
						name={item}
						size="small"
						inline
					/>
					<span className="p-1" />
				</>
			)}
			{icons && Array.isArray(icons) && [...Array(4).keys()].map((index) => getItemIconIfExists(icons, index))}
			<span className="p-1" />
			{label && <span>{label}</span>}
		</>
	);
}

function BlueprintContentHeader({
	data,
	blueprintKey,
	positionArray = [],
}: BlueprintContentHeaderProps): React.ReactElement | null {
	if (data.blueprint_book) {
		return getBlueprintBook(data.blueprint_book, blueprintKey, positionArray);
	} else if (data.blueprint) {
		return getBlueprint(data.blueprint);
	} else if (data.deconstruction_planner) {
		return getBlueprint(data.deconstruction_planner);
	} else if (data.upgrade_planner) {
		return getBlueprint(data.upgrade_planner);
	} else {
		console.error('Unknown blueprint data type:', data);
		return null;
	}
}

function getFirstRow(data: BlueprintBook): React.ReactElement {
	const {icons, item, label} = data;

	return (
		<>
			{item && (
				<FactorioIcon
					type="item"
					name={item}
					size="small"
					inline
				/>
			)}
			<span className="p-1" />
			{icons && Array.isArray(icons) && [...Array(4).keys()].map((index) => getItemIconIfExists(icons, index))}
			<span className="p-1" />
			{label && <span>{label}</span>}
		</>
	);
}

function getItemIconIfExists(icons: BlueprintIcon[], index: number): React.ReactElement {
	if (index >= icons.length || !icons[index]) {
		return (
			<Placeholder
				key={index}
				size="small"
				inline
			/>
		);
	}

	const icon = icons[index];
	const signal = icon.signal;

	if (!signal || !signal.name) {
		return (
			<Placeholder
				key={index}
				size="small"
				inline
			/>
		);
	}

	return (
		<FactorioIcon
			key={index}
			name={signal.name}
			type={signal.type || 'item'}
			size="small"
			inline
		/>
	);
}

export default BlueprintContentHeader;
