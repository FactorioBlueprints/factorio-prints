import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import React     from 'react';

import Button    from 'react-bootstrap/Button';
import Card      from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';

import ItemIcon from '../ItemIcon';
import NewIcon  from '../NewIcon';

BlueprintContentHeader.propTypes = forbidExtraProps({
	data              : PropTypes.object.isRequired,
	blueprintKey      : PropTypes.string.isRequired,
	blueprintStringSha: PropTypes.string.isRequired,
	position          : PropTypes.objectOf(PropTypes.number),
});

function BlueprintContentHeader({data, blueprintStringSha, blueprintKey, position = undefined})
{
	function getBlueprintBook(data)
	{
		const firstRow = getFirstRow(data);

		let {blueprints, active_index} = data;
		if (blueprints === undefined)
		{
			blueprints = [];
		}

		if (position === undefined)
		{
			position = {position: 0};
		}

		return (
			<>
				{firstRow}
				<Card>
					<ListGroup variant='flush'>
						{
							blueprints.map((each, index) => (
								<ListGroup.Item key={index} active={index === active_index}>
									<BlueprintContentHeader
										data={each}
										blueprintStringSha={blueprintStringSha}
										blueprintKey={blueprintKey}
										position={position}
									/>
								</ListGroup.Item>),
							)
						}
					</ListGroup>
				</Card>
			</>
		);
	}

	function getFbeButton()
	{
		if (position === undefined)
		{
			return <> </>;
		}

		const href = `https://fbe.teoxoy.com/?source=https://www.factorio.school/view/${blueprintKey}&index=${position.position - 1}`;

		return <Button
			type='button'
			href={href}
			target='_blank'
			className='float-end'
			size='sm'
		>
			<img
				height={'20px'}
				width={'20px'}
				src={'/icons/fbe.png'}
				alt={'fbe'}
			/>
			<span className='p-1' />
			Render image
			<span className='p-1' />
			{position.position - 1}
		</Button>
	}

	function getBlueprint(data)
	{
		const {icons, item, label} = data;
		if (position)
		{
			position.position++;
		}
		return (
			<>
				<NewIcon iconType={'item'} iconName={item} />
				<span className='p-1' />
				{icons && [...Array(4).keys()].map(index => getItemIconIfExists(icons, index))}
				<span className='p-1' />
				<span>{transformLabelIcons(label)}</span>

				<span className='p-1' />

				{getFbeButton()}
			</>
		);
	}


	if (data.blueprint_book)
	{
		return getBlueprintBook(data.blueprint_book);
	}
	else if (data.blueprint)
	{
		return getBlueprint(data.blueprint);
	}
	else if (data.deconstruction_planner)
	{
		return getBlueprint(data.deconstruction_planner);
	}
	else if (data.upgrade_planner)
	{
		return getBlueprint(data.upgrade_planner);
	}
	else
	{
		throw new Error(JSON.stringify(data, null, 2));
	}
}

function transformLabelIcons(label)
{
	const labelParts = label && label.split(/(\[[^\]]+])/);

	// Transform each labelPart.
	const transformedLabelParts = labelParts && labelParts.map((labelPart, index) =>
	{
		// If it matches the form [item=transport-belt], then replace it with an icon pointing to a url of the form http://localhost:3000/icons/item/transport-belt.png.
		const match = labelPart && labelPart.match(/^\[(item|recipe|entity)=([^\]]+)]$/);
		if (match)
		{
			const iconType = match[1];
			const iconName = match[2];
			return <NewIcon key={index} iconType={iconType} iconName={iconName} />;
		}

		// If it matches the form [img=item/transport-belt], then replace it with an icon pointing to a url of the form http://localhost:3000/icons/item/transport-belt.png.
		const match2 = labelPart && labelPart.match(/^\[img=([^/]+)\/([^\]]+)]$/);
		if (match2)
		{
			const iconType = match2[1];
			const iconName = match2[2];
			return <NewIcon key={index} iconType={iconType} iconName={iconName} />;
		}

		// Otherwise return it as a string.
		return labelPart;
	});
	return transformedLabelParts;
}

function getFirstRow(data)
{
	const {icons, item, label} = data;

	return (
		<>
			<ItemIcon item={item} />
			<span className='p-1' />
			{icons && [...Array(4).keys()].map(index => getItemIconIfExists(icons, index))}
			<span className='p-1' />
			<span>{transformLabelIcons(label)}</span>
		</>
	);
}

function getItemIconIfExists(icons, index)
{
	if (index >= icons.length)
	{
		return <ItemIcon key={index} item='blank' />;
	}

	const signal                           = icons[index].signal;
	const {name: iconName, type: iconType} = signal;

	if (iconName === undefined)
	{
		return <ItemIcon key={index} item='blank' />;
	}

	return <NewIcon key={index} iconName={iconName} iconType={iconType} />;
}

export default BlueprintContentHeader;
