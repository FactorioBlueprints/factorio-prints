import React, {useContext} from 'react';
import UserContext         from '../context/userContext';

EfficientAccount.propTypes = {

};

function EfficientAccount(props)
{
	const {user}       = useContext(UserContext);

	if (!user)
	{
		return (
			<Jumbotron>
				<h1 className='display-4'>
					{'Account Settings'}
				</h1>
				<p className='lead'>
					{'Please log in with Google or GitHub in order to edit your account settings.'}
				</p>
			</Jumbotron>
		);
	}

	return (
		<div></div>
	);
}

export default EfficientAccount;
