import {AuthProvider, getAuth, onAuthStateChanged, signInWithPopup, User} from 'firebase/auth';

import React, {useState} from 'react';

import {app} from '../../base';
import UserContext, {type UserContextType} from '../../context/userContext';

const auth = getAuth(app);

interface UserStateProps {
	children: React.ReactNode;
}

function UserState({children}: UserStateProps) {
	const [user, setUser] = useState<User | undefined>(undefined);

	onAuthStateChanged(auth, (authUser) => setUser(authUser ?? undefined));

	const authenticate = (provider: AuthProvider) => {
		signInWithPopup(auth, provider)
			.then((result) => {
				const user = result.user;
				setUser(user);
			})
			.catch((error) => {
				const errorCode = error.code;
				const errorMessage = error.message;
				const email = error.customData.email;
				console.log({error, errorCode, errorMessage, email});
				setUser(undefined);
			});
	};

	const handleLogout = () => {
		auth.signOut();
	};

	const contextValue: UserContextType = {user, authenticate, handleLogout};

	return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}

export default UserState;
