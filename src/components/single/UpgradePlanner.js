import {faArrowRight} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';

import {FactorioIcon} from '../core/icons/FactorioIcon';

UpgradePlanner.propTypes = forbidExtraProps({
	mappers: PropTypes.arrayOf(
		PropTypes.shape({
			from: PropTypes.string.isRequired,
			to: PropTypes.string.isRequired,
		}).isRequired,
	).isRequired,
});

function UpgradePlanner(props) {
	const {mappers} = props;
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
