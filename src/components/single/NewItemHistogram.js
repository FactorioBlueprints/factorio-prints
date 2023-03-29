import {forbidExtraProps} from 'airbnb-prop-types';

import isEmpty   from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import React     from 'react';
import Card      from 'react-bootstrap/Card';
import Table     from 'react-bootstrap/Table';

import entitiesWithIcons from '../../data/entitiesWithIcons';

NewItemHistogram.propTypes = forbidExtraProps({
	title: PropTypes.string.isRequired,
	items: PropTypes.arrayOf(PropTypes.shape({
		name : PropTypes.string.isRequired,
		count: PropTypes.number.isRequired,
		mod  : PropTypes.number.isRequired,
	})).isRequired,
});

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
					{
						props.items.map(item => (
							<tr key={item.name}>
								<td className={`icon icon-${entitiesWithIcons[item.name]}`}>
									{
										entitiesWithIcons[item.name]
											? <img
												height={'32px'}
												width={'32px'}
												src={`/icons/${item.name}.png`}
												alt={item.name}
											/>
											: ''
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
						))
					}
				</tbody>
			</Table>
		</Card>
	);
}

export default NewItemHistogram;
