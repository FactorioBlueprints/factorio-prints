import UserContext, {User} from "../context/userContext";
import {useContext} from 'react';

import moderators from "../helpers/moderators";

function useIsModerator(): boolean
{
	const user: User | null | undefined = useContext(UserContext);
	if (user === undefined || user === null)
	{
		return false;
	}
	return moderators.includes(user.uid);
}

export default useIsModerator;
