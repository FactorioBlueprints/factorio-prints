import UserContext, {User} from "../context/userContext";
import {useContext} from 'react';

import moderators from "../helpers/moderators";

function useIsModerator(): boolean
{
	const user: User | undefined = useContext(UserContext);
	if (user === undefined)
	{
		return false;
	}
	return moderators.includes(user.uid);
}

export default useIsModerator;
