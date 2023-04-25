import {getAuth, onAuthStateChanged, signInWithPopup} from 'firebase/auth';

import PropTypes         from 'prop-types';
import React, {useState} from 'react';

import {app}       from '../../base';
import UserContext from '../../context/userContext';

const auth = getAuth(app);

UserState.propTypes = {
	children: PropTypes.node.isRequired,
};

function UserState(props)
{
	const [user, setUser] = useState(undefined);

	onAuthStateChanged(auth, setUser);

	const authenticate = (provider) =>
	{
		signInWithPopup(auth, provider)
			.then((result) =>
			{
				const user = result.user;
				setUser(user);
			}).catch((error) =>
		{
			// Handle Errors here.
			const errorCode    = error.code;
			const errorMessage = error.message;
			// The email of the user's account used.
			const email        = error.customData.email;
			console.log({error, errorCode, errorMessage, email});
			setUser(undefined);
		});
	};

	const handleLogout = () =>
	{
		auth.signOut();
	};

	return (<UserContext.Provider value={{user, authenticate, handleLogout}}>
		{props.children}
	</UserContext.Provider>);
}

export default UserState;
