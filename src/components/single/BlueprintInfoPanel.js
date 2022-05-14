import {faCalendar, faClock, faCodeBranch, faHeart, faUser} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import moment             from 'moment';
import PropTypes          from 'prop-types';
import React              from 'react';
import Card               from 'react-bootstrap/Card';
import Table              from 'react-bootstrap/Table';
import {Link}             from 'react-router-dom';
import useBlueprint       from '../../hooks/useBlueprint';

import BlueprintVersion from './BlueprintVersion';

BlueprintInfoPanel.propTypes = forbidExtraProps({
	blueprintKey      : PropTypes.string.isRequired,
	ownedByCurrentUser: PropTypes.bool.isRequired,
});

function BlueprintInfoPanel({blueprintKey, ownedByCurrentUser})
{
	const result = useBlueprint(blueprintKey);
	
	const {createdOn, systemFrom, author: {userId: authorId, displayName}, numberOfUpvotes} = result.data.data;

	return (
		<Card>
			<Card.Header>
				Info
			</Card.Header>
			<Table bordered hover>
				<tbody>
					<tr>
						<td>
							<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
							{' Author'}
						</td>
						<td>
							<Link to={`/user/${authorId}`}>
								{displayName}
								{ownedByCurrentUser && <span className='pull-right'><b>{' (You)'}</b></span>}
							</Link>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faCalendar} size='lg' fixedWidth />
							{' Created'}
						</td>
						<td>
							<span
								title={moment(createdOn).format('dddd, MMMM Do YYYY, h:mm:ss a')}
							>
								{moment(createdOn).fromNow()}
							</span>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
							{' Last Updated'}
						</td>
						<td>
							<span
								title={moment(systemFrom).format('dddd, MMMM Do YYYY, h:mm:ss a')}
							>
								{moment(systemFrom).fromNow()}
							</span>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
							{' Favorites'}
						</td>
						<td>
							{numberOfUpvotes}
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faCodeBranch} size='lg' fixedWidth />
							{' Version'}
						</td>
						<td>
							<BlueprintVersion blueprintKey={blueprintKey} />
						</td>
					</tr>
				</tbody>
			</Table>
		</Card>
	);
}

export default BlueprintInfoPanel;
