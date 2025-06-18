import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';

import {FactorioIcon, Placeholder} from '../core/icons/FactorioIcon';

interface IconSignal {
	name?: string;
	type?: string;
}

interface BlueprintIcon {
	signal: IconSignal;
}

interface BlueprintItemData {
	icons?: BlueprintIcon[];
	item?: string;
	labelHtml?: string;
	blueprints?: BlueprintData[];
	active_index?: number;
}

interface BlueprintData {
	blueprint_book?: BlueprintItemData;
	blueprint?: BlueprintItemData;
	deconstruction_planner?: BlueprintItemData;
	upgrade_planner?: BlueprintItemData;
}

interface BlueprintContentHeaderProps {
	data: BlueprintData;
	blueprintKey: string;
	blueprintStringSha: string;
	positionArray?: number[];
}

function getBlueprintBook(
	data: BlueprintItemData,
	blueprintStringSha: string,
	blueprintKey: string,
	positionArray: number[],
) {
	const firstRow = getFirstRow(data);

	let {blueprints, active_index} = data;
	if (blueprints === undefined) {
		blueprints = [];
	}

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
								blueprintStringSha={blueprintStringSha}
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

function getFbeButton(positionArray: number[], blueprintStringSha: string) {
	const href = positionArray.length === 0 ? '/' : `/position/${positionArray.join('.')}`;

	const caption = positionArray.join('.');

	return (
		<Button
			type="button"
			href={`https://fbe.teoxoy.com/?source=https://www.factorio.school/api/blueprintData/${blueprintStringSha}${href}`}
			target="_blank"
			className="float-end"
			size="sm"
		>
			<img
				height={'20px'}
				width={'20px'}
				src={'/icons/fbe.png'}
				alt={'fbe'}
			/>
			<span className="p-1" />
			Render image
			<span className="p-1" />
			{caption}
		</Button>
	);
}

function getBlueprint(data: BlueprintItemData, positionArray: number[], blueprintStringSha: string) {
	const {icons, item, labelHtml} = data;

	return (
		<>
			{item ? (
				<FactorioIcon
					icon={{type: 'item', name: item}}
					size="small"
					inline
				/>
			) : (
				<Placeholder
					size="small"
					inline
				/>
			)}
			<span className="p-1" />
			{icons && [0, 1, 2, 3].map((index) => getItemIconIfExists(icons, index))}
			<span className="p-1" />
			<span
				// biome-ignore lint/security/noDangerouslySetInnerHtml: rendering pre-sanitized label HTML
				dangerouslySetInnerHTML={{__html: labelHtml || ''}}
			/>
			<span className="p-1" />
			{getFbeButton(positionArray, blueprintStringSha)}
		</>
	);
}

function BlueprintContentHeader({
	data,
	blueprintStringSha,
	blueprintKey,
	positionArray = [],
}: BlueprintContentHeaderProps) {
	if (data.blueprint_book) {
		return getBlueprintBook(data.blueprint_book, blueprintStringSha, blueprintKey, positionArray);
	} else if (data.blueprint) {
		return getBlueprint(data.blueprint, positionArray, blueprintStringSha);
	} else if (data.deconstruction_planner) {
		return getBlueprint(data.deconstruction_planner, positionArray, blueprintStringSha);
	} else if (data.upgrade_planner) {
		return getBlueprint(data.upgrade_planner, positionArray, blueprintStringSha);
	} else {
		throw new Error(JSON.stringify(data, null, 2));
	}
}

function getFirstRow(data: BlueprintItemData) {
	const {icons, item, labelHtml} = data;

	return (
		<>
			{item ? (
				<FactorioIcon
					icon={{type: 'item', name: item}}
					size="small"
					inline
				/>
			) : (
				<Placeholder
					size="small"
					inline
				/>
			)}
			<span className="p-1" />
			{icons && [0, 1, 2, 3].map((index) => getItemIconIfExists(icons, index))}
			<span className="p-1" />
			<span
				// biome-ignore lint/security/noDangerouslySetInnerHtml: rendering pre-sanitized label HTML
				dangerouslySetInnerHTML={{__html: labelHtml || ''}}
			/>
		</>
	);
}

function getItemIconIfExists(icons: BlueprintIcon[], index: number) {
	if (index >= icons.length) {
		return (
			<Placeholder
				key={index}
				size="small"
				inline
			/>
		);
	}

	const signal = icons[index].signal;
	const {name: iconName, type: iconType} = signal;

	if (iconName === undefined) {
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
			icon={{name: iconName, type: iconType}}
			size="small"
			inline
		/>
	);
}

export default BlueprintContentHeader;
