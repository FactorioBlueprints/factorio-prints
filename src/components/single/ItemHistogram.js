import {forbidExtraProps} from 'airbnb-prop-types';

import isEmpty   from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import React     from 'react';
import Card      from 'react-bootstrap/Card';
import Table     from 'react-bootstrap/Table';

import entitiesWithIcons from '../../data/entitiesWithIcons';

ItemHistogram.propTypes = forbidExtraProps({
	title: PropTypes.string.isRequired,
	items: PropTypes.arrayOf(PropTypes.shape({
		item : PropTypes.string.isRequired,
		count: PropTypes.number.isRequired,
	})).isRequired,
});

function ItemHistogram(props)
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
				</colgroup>

				<tbody>
					{
						props.items.map(item => (
							<tr key={item.item}>
								<td className={`icon icon-${entitiesWithIcons[item.item]}`}>
									{
										entitiesWithIcons[item.item]
											? <img
												height={'32px'}
												width={'32px'}
												src={`/icons/${item.item}.png`}
												alt={item.item}
											/>
											: ''
									}
								</td>
								<td className='number'>
									{item.count}
								</td>
								<td>
									{item.item}
								</td>
							</tr>
						))
					}
				</tbody>
			</Table>
		</Card>
	);
}

export default ItemHistogram;
