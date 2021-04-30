import React, {Context} from 'react';

export interface User
{
	uid: string
	email: string
}

const UserContext: Context<User | undefined> = React.createContext<User | undefined>(undefined);

export default UserContext;
