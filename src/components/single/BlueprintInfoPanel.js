import {faCalendar, faClock, faCodeBranch, faHeart, faUser} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from '../../utils/propTypes';
import dayjs              from 'dayjs';
import relativeTime       from 'dayjs/plugin/relativeTime';
import PropTypes          from 'prop-types';
import React              from 'react';
import Card               from 'react-bootstrap/Card';
import Table              from 'react-bootstrap/Table';
import {Link}             from 'react-router-dom';
import useBlueprint       from '../../hooks/useBlueprint';

import BlueprintVersion from './BlueprintVersion';

import {useQueryClient}   from '@tanstack/react-query';

dayjs.extend(relativeTime);

BlueprintInfoPanel.propTypes = forbidExtraProps({
	blueprintKey      : PropTypes.string.isRequired,
	blueprintStringSha: PropTypes.string,
	ownedByCurrentUser: PropTypes.bool.isRequired,
});

function BlueprintInfoPanel({blueprintKey, blueprintStringSha, ownedByCurrentUser})
{
	const result = useBlueprint(blueprintKey);

	const {
			  author     : {displayName},
			  voteSummary,
			  version    : {createdOn, systemFrom, createdBy: {userId: authorId}},
		  } = result.data.data;

	const numberOfUpvotes = voteSummary?.numberOfUpvotes;
	const queryClient = useQueryClient()
	if (voteSummary === undefined)
	{
		console.log('BlueprintInfoPanel clearing the query cache')
		queryClient.clear()
	}

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
								title={dayjs(createdOn).format('dddd, MMMM Do YYYY, h:mm:ss a')}
							>
								{dayjs(createdOn).fromNow()}
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
								title={dayjs(systemFrom).format('dddd, MMMM Do YYYY, h:mm:ss a')}
							>
								{dayjs(systemFrom).fromNow()}
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
							<BlueprintVersion blueprintStringSha={blueprintStringSha} />
						</td>
					</tr>
				</tbody>
			</Table>
		</Card>
	);
}

export default BlueprintInfoPanel;
