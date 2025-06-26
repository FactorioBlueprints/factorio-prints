import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {getAuth, User} from 'firebase/auth';
import React from 'react';
import {useAuthState} from 'react-firebase-hooks/auth';
import {Link, useRouterState} from '@tanstack/react-router';

import {app} from '../base';
import {useUserDisplayName} from '../hooks/useUser';

interface DisplayNameProps {
	userId?: string;
	withLink?: boolean;
	externalIsLoading?: boolean;
}

const DisplayName: React.FC<DisplayNameProps> = ({ userId, withLink = true, externalIsLoading = false }) =>
{
	const [currentUser] = useAuthState(getAuth(app)) as [User | null | undefined, boolean, Error | undefined];
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
			<Link to="/user/$userId" params={{ userId }}>
				{content}
			</Link>
		);
	}

	return content;
};

export default React.memo(DisplayName);
