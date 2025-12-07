import {faArrowRight} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';

import {FactorioIcon} from '../core/icons/FactorioIcon';

interface Mapper {
	from: string;
	to: string;
}

interface UpgradePlannerProps {
	mappers: Mapper[];
}

function UpgradePlanner({mappers}: UpgradePlannerProps) {
	return (
		<Card>
			<Card.Header>Upgrade Planner</Card.Header>
			<Table hover>
				<tbody>
					{mappers.map(({from, to}, index) => (
						<tr key={index}>
							<td className="d-flex align-items-center justify-content-center">
								<FactorioIcon
									icon={{name: from, type: 'item'}}
									size="small"
									inline
								/>
								<FontAwesomeIcon
									icon={faArrowRight}
									size="lg"
									fixedWidth
								/>
								<FactorioIcon
									icon={{name: to, type: 'item'}}
									size="small"
									inline
								/>
							</td>
						</tr>
					))}
				</tbody>
			</Table>
		</Card>
	);
}

export default UpgradePlanner;
