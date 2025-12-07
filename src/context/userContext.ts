import React from 'react';
import type {AuthProvider, User} from 'firebase/auth';

export interface UserContextType {
	user: User | undefined;
	authenticate: ((provider: AuthProvider) => void) | undefined;
	handleLogout: (() => void) | undefined;
}

const UserContext = React.createContext<UserContextType>({user: undefined, authenticate: undefined, handleLogout: undefined});

export default UserContext;
