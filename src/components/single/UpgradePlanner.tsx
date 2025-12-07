import {faArrowRight} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import React     from 'react';
import Card      from 'react-bootstrap/Card';
import Table     from 'react-bootstrap/Table';

import ItemIcon from '../ItemIcon';

interface Mapper {
	from: string;
	to: string;
}

interface UpgradePlannerProps {
	mappers: Mapper[];
}

function UpgradePlanner({mappers}: UpgradePlannerProps)
{
	return (
		<Card>
			<Card.Header>
				Upgrade Planner
			</Card.Header>
			<Table hover>
				<tbody>
					{
						mappers.map(({from, to}, index) =>
							// eslint-disable-next-line react/no-array-index-key
							<tr key={index}>
								<td className='d-flex align-items-center justify-content-center'>
									<ItemIcon item={from} />
									<FontAwesomeIcon icon={faArrowRight} size='lg' fixedWidth />
									<ItemIcon item={to} />
								</td>
							</tr>,
						)
					}
				</tbody>
			</Table>
		</Card>
	);
}

export default UpgradePlanner;
