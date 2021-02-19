import PropTypes from 'prop-types';
import React     from 'react';
import Card      from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import ItemIcon  from '../ItemIcon';

BlueprintContentHeader.propTypes = {
	data    : PropTypes.object.isRequired,
	isActive: PropTypes.bool,
};

function BlueprintContentHeader(props)
{
	const {data, isActive} = props;
	const body             = getBody(data);
	const bg               = isActive ? 'dark' : 'primary';

	return body;
}

function getBody(data)
{
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

function getRowContent(data)
{

}

function getBlueprintBook(data)
{
	const firstRow = getBlueprint(data);

	const {icons, item, label, blueprints, active_index} = data;

	return (
		<>
			{firstRow}
			<Card>
				<ListGroup variant='flush'>
					{
						blueprints.map(each =>
							(
								<ListGroup.Item key={each.index} active={each.index === active_index}>
									<BlueprintContentHeader data={each} />
								</ListGroup.Item>
							),
						)
					}
				</ListGroup>
			</Card>
		</>
	);
};

function getBlueprint(data)
{
	const {icons, item, label} = data;

	return (
		<>
			<ItemIcon item={item} />
			<span className='mr-3' />
			{icons && [...Array(4).keys()].map(index => getItemIconIfExists(icons, index))}
			<span className='mr-3' />
			<span>
				{` ${label || ''}`}
			</span>
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
