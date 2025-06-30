import {forbidExtraProps} from '../../utils/propTypes';

import isEmpty   from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import React     from 'react';
import Card      from 'react-bootstrap/Card';
import Table     from 'react-bootstrap/Table';
import NewIcon   from '../NewIcon';

NewItemHistogram.propTypes = forbidExtraProps({
	title: PropTypes.string.isRequired,
	items: PropTypes.arrayOf(PropTypes.shape({
		name : PropTypes.string.isRequired,
		count: PropTypes.number.isRequired,
		mod  : PropTypes.string.isRequired,
	})).isRequired,
	type: PropTypes.string.isRequired
});

function ItemHistogramRow(item)
{
	return <tr>
		<td className={`icon icon-${item.name}`}>
			{
				<NewIcon iconName={item.name} iconType={item.type} />
			}
		</td>
		<td className='number'>
			{item.count}
		</td>
		<td>
			{item.name}
		</td>
		<td>
			{item.mod}
		</td>
	</tr>
}

function NewItemHistogram(props)
{
	if (isEmpty(props.items))
	{
		return <></>;
	}

	return (
		<Card>
			<Card.Header>
				{props.title}
			</Card.Header>
			<Table bordered hover>
				<colgroup>
					<col span='1' style={{width: '1%'}} />
					<col span='1' style={{width: '1%'}} />
					<col span='1' />
					<col span='1' style={{width: '1%'}} />
				</colgroup>

				<tbody>
					{props.items.map(item => <ItemHistogramRow {...item} key={item.name} type={props.type} />)}
				</tbody>
			</Table>
		</Card>
	);
}

export default NewItemHistogram;
