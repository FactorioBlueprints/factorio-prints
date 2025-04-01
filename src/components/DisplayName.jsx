import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {getAuth} from 'firebase/auth';
import PropTypes from 'prop-types';
import React from 'react';
import {useAuthState} from 'react-firebase-hooks/auth';
import {Link} from '@tanstack/react-router';

import {app} from '../base';
import {useUserDisplayName} from '../hooks/useUser';

const DisplayName = ({ userId, withLink = true, externalIsLoading = false }) =>
{
	const [currentUser] = useAuthState(getAuth(app));
	const isYou = currentUser && currentUser.uid === userId;

	const {
		data: displayName,
		isLoading: nameIsLoading,
	} = useUserDisplayName(userId);

	const isLoading = nameIsLoading || externalIsLoading || !userId;

	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} spin />;
	}

	const nameStyle = isYou ? 'text-warning' : '';
	const youText = isYou ? ' (You)' : '';
	const content = <span className={nameStyle}>{displayName}{youText}</span>;

	if (withLink)
	{
		return (
			<Link to={`/user/${userId}`}>
				{content}
			</Link>
		);
	}

	return content;
};

DisplayName.propTypes = {
	userId           : PropTypes.string,
	withLink         : PropTypes.bool,
	externalIsLoading: PropTypes.bool,
};

export default React.memo(DisplayName);
