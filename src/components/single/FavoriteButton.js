import {forbidExtraProps}  from 'airbnb-prop-types';
import axios               from 'axios';
import PropTypes           from 'prop-types';
import React, {useContext} from 'react';
import Button              from 'react-bootstrap/Button';

import {useMutation, useQueryClient} from 'react-query';

import UserContext   from '../../context/userContext';
import getHeaders    from '../../helpers/getHeaders';
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
	return axios.put(url, body, config);
}

function FavoriteButton({blueprintKey})
{
	const queryClient  = useQueryClient();
	const user         = useContext(UserContext);
	const queryEnabled = user !== undefined;

	// TODO: Switch to the other favorites hook
	const {isSuccess, data: isFavorite} = useIsFavorite(blueprintKey);

	const toggleFavoriteMutation = useMutation(
		() => postIsFavorite(blueprintKey, !isFavorite, user),
		{
			enabled  : queryEnabled,
			onSuccess: () =>
			{
				queryClient.invalidateQueries([user.email, 'isFavorite', blueprintKey]);
				queryClient.invalidateQueries([user.email, 'favorites']);
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
