import React, {Context} from 'react';

export interface User
{
	uid: string
	email: string
}

const UserContext: Context<User | null | undefined> = React.createContext<User | null | undefined>(undefined);

export default UserContext;
