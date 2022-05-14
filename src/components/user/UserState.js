import PropTypes         from 'prop-types';
import React, {useState} from 'react';
import {app}             from '../../base';
import UserContext       from '../../context/userContext';

UserState.propTypes = {
	children: PropTypes.node.isRequired,
};

function UserState(props)
{
	const [user, setUser] = useState(undefined);

	React.useEffect(() =>
	{
		const unsubscribe = app.auth().onAuthStateChanged(
			async (user) => setUser(user),
			(...args) => console.log('UserState onAuthStateChanged error', args),
		);
		return () => unsubscribe();
	}, []);

	return (
		<UserContext.Provider value={user}>
			{props.children}
		</UserContext.Provider>
	);
}

export default UserState;
