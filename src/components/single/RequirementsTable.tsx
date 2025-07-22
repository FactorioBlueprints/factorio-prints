import React from 'react';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';

import entitiesWithIcons from '../../data/entitiesWithIcons';
import {FactorioIcon} from '../core/icons/FactorioIcon';

interface RequirementsTableProps {
	entityHistogram: [string, number][];
	itemHistogram: [string, number][];
}

export function RequirementsTable({entityHistogram, itemHistogram}: RequirementsTableProps) {
	return (
		<Card>
			<Card.Header>Requirements</Card.Header>
			<Table
				bordered
				hover
			>
				<colgroup>
					<col
						span={1}
						style={{width: '1%'}}
					/>
					<col
						span={1}
						style={{width: '1%'}}
					/>
					<col span={1} />
				</colgroup>

				<tbody>
					{entityHistogram.map((pair) => {
						if (typeof pair[0] === 'object' || typeof pair[1] === 'object') {
							return null;
						}
						return (
							<tr key={pair[0]}>
								<td className={`icon icon-${(entitiesWithIcons as any)[pair[0]]}`}>
									{(entitiesWithIcons as any)[pair[0]] ? (
										<FactorioIcon
											icon={{name: pair[0], type: 'item'}}
											size="small"
										/>
									) : (
										''
									)}
								</td>
								<td className="number">{pair[1]}</td>
								<td>{pair[0]}</td>
							</tr>
						);
					})}
					{itemHistogram.map((pair) => {
						if (typeof pair[0] === 'object' || typeof pair[1] === 'object') {
							return null;
						}
						return (
							<tr key={pair[0]}>
								<td className={`icon icon-${(entitiesWithIcons as any)[pair[0]]}`}>
									{(entitiesWithIcons as any)[pair[0]] ? (
										<FactorioIcon
											icon={{name: pair[0], type: 'item'}}
											size="small"
										/>
									) : (
										''
									)}
								</td>
								<td className="number">{pair[1]}</td>
								<td>{pair[0]}</td>
							</tr>
						);
					})}
				</tbody>
			</Table>
		</Card>
	);
}
