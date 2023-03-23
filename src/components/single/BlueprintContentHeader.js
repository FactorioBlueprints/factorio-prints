import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import React     from 'react';

import Button    from 'react-bootstrap/Button';
import Card      from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';

import ItemIcon from '../ItemIcon';

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

		const href = `https://fbe.teoxoy.com/?source=https://www.factorio.school/view/${blueprintKey}&index=${position.position / 2 - 1}`;

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
			{position.position / 2 - 1}
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
				<ItemIcon item={item} />
				<span className='p-1' />
				{icons && [...Array(4).keys()].map(index => getItemIconIfExists(icons, index))}
				<span className='p-1' />
				<span>{`${label || ''}`}</span>

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

function getFirstRow(data)
{
	const {icons, item, label} = data;

	return (
		<>
			<ItemIcon item={item} />
			<span className='p-1' />
			{icons && [...Array(4).keys()].map(index => getItemIconIfExists(icons, index))}
			<span className='p-1' />
			<span>{`${label || ''}`}</span>
		</>
	);
}

function getItemIconIfExists(icons, index)
{
	const iconName = index >= icons.length
		? 'blank'
		: icons[index].signal.name;

	return <ItemIcon key={index} item={iconName} />;
}

export default BlueprintContentHeader;
