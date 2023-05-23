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
	positionArray          : PropTypes.arrayOf(PropTypes.number),
});

function getBlueprintBook(data, blueprintStringSha, blueprintKey, positionArray)
{
	const firstRow = getFirstRow(data);

	let {blueprints, active_index} = data;
	if (blueprints === undefined)
	{
		blueprints = [];
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
									positionArray={[...positionArray, index]}
								/>
							</ListGroup.Item>),
						)
					}
				</ListGroup>
			</Card>
		</>
	);
}

function getFbeButton(positionArray, blueprintStringSha)
{
	const href = positionArray.length === 0
		? '/'
		: `/position/${positionArray.join('.')}`;

	const caption = positionArray.join('.');

	return <Button
		type='button'
		href={`https://fbe.teoxoy.com/?source=https://www.factorio.school/api/blueprintData/${blueprintStringSha}${href}`}
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
		{caption}
	</Button>
}

function getBlueprint(data, positionArray, blueprintStringSha)
{
	const {icons, item, labelHtml} = data;

	return (
		<>
			<NewIcon iconType={'item'} iconName={item} />
			<span className='p-1' />
			{icons && [...Array(4).keys()].map(index => getItemIconIfExists(icons, index))}
			<span className='p-1' />
			<span dangerouslySetInnerHTML={{__html: labelHtml}} />
			<span className='p-1' />
			{getFbeButton(positionArray, blueprintStringSha)}
		</>
	);
}

function BlueprintContentHeader({data, blueprintStringSha, blueprintKey, positionArray = []})
{
	if (data.blueprint_book)
	{
		return getBlueprintBook(data.blueprint_book, blueprintStringSha, blueprintKey, positionArray);
	}
	else if (data.blueprint)
	{
		return getBlueprint(data.blueprint, positionArray, blueprintStringSha);
	}
	else if (data.deconstruction_planner)
	{
		return getBlueprint(data.deconstruction_planner, positionArray, blueprintStringSha);
	}
	else if (data.upgrade_planner)
	{
		return getBlueprint(data.upgrade_planner, positionArray, blueprintStringSha);
	}
	else
	{
		throw new Error(JSON.stringify(data, null, 2));
	}
}

function getFirstRow(data)
{
	const {icons, item, labelHtml} = data;

	return (
		<>
			<ItemIcon item={item} />
			<span className='p-1' />
			{icons && [...Array(4).keys()].map(index => getItemIconIfExists(icons, index))}
			<span className='p-1' />
			<span dangerouslySetInnerHTML={{__html: labelHtml}} />
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
