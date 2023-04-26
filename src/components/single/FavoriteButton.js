import {useMutation, useQueryClient} from '@tanstack/react-query';
import {forbidExtraProps}            from 'airbnb-prop-types';
import axios                         from 'axios';

import {getDatabase, ref, update} from 'firebase/database';

import PropTypes           from 'prop-types';
import React, {useContext} from 'react';
import Button              from 'react-bootstrap/Button';

import {app} from '../../base';

import UserContext   from '../../context/userContext';
import useIsFavorite from '../../hooks/useIsFavorite';

import FavoriteIcon from './FavoriteIcon';

async function postIsFavorite(blueprintKey, isFavorite, user)
{
	const url     = `${process.env.REACT_APP_REST_URL}/api/my/favorite/${blueprintKey}`;
	const body    = null;
	const idToken = user === undefined ? undefined : await user.getIdToken();
	const config  = {
		headers: {
			Authorization: `Bearer ${idToken}`,
			'content-type': 'application/json',
		},
		params : {
			isFavorite,
		},
	};
	let put       = axios.put(url, body, config);

	const {uid}                = user;

	const wasFavorite          = !isFavorite;

	console.log('postIsFavorite', {blueprintKey, isFavorite, user, uid, wasFavorite});

	const updates = {
		[`/blueprints/${blueprintKey}/favorites/${uid}`]         : wasFavorite ? null : true,
		[`/users/${uid}/favorites/${blueprintKey}`]              : wasFavorite ? null : true,
	};

	const database = getDatabase(app);

	update(ref(database), updates);

	return put;
}

function FavoriteButton({blueprintKey})
{
	const queryClient  = useQueryClient();
	const {user}         = useContext(UserContext);
	const queryEnabled = user !== undefined;

	// TODO: Switch to the other favorites hook
	const {isSuccess, data: isFavorite} = useIsFavorite(blueprintKey);

	const toggleFavoriteMutation = useMutation(
		() => postIsFavorite(blueprintKey, !isFavorite, user),
		{
			enabled  : queryEnabled,
			onSuccess: () =>
			{
				queryClient.invalidateQueries(['api/my/favorites/', user.uid]);
				queryClient.invalidateQueries(['api/my/favorite/', blueprintKey, user.uid]);
				queryClient.invalidateQueries(['/api/my/favoriteBlueprints/page', user.email]);
				queryClient.invalidateQueries(['blueprintDetails', blueprintKey]);
			},
		});

	const buttonEnabled = queryEnabled && isSuccess;

	return (
		<Button
			size='lg'
			disabled={!buttonEnabled}
			onClick={() =>
			{
				toggleFavoriteMutation.mutate({
					blueprintKey,
					isFavorite: !isFavorite,
				});
			}}
		>
			<FavoriteIcon isFavorite={isFavorite} />
			{' Favorite'}
		</Button>
	);
}

FavoriteButton.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

export default FavoriteButton;
