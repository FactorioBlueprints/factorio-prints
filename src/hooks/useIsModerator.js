import {useContext} from 'react';
import UserContext  from '../context/userContext';

import moderators from '../helpers/moderators';

function useIsModerator()
{
	const {user} = useContext(UserContext);
	if (user === undefined || user === null)
	{
		return false;
	}
	return moderators.includes(user.uid);
}

export default useIsModerator;
