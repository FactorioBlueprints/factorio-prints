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
	const idToken = user === undefined ? undefined : await user.getIdToken();
	const headers = getHeaders(idToken);
	return axios.put(`${process.env.REACT_APP_REST_URL}/api/my/favorite/${blueprintKey}?isFavorite=${isFavorite}`, null, headers);
}

function FavoriteButton({blueprintKey})
{
	const queryClient  = useQueryClient();
	const {user}       = useContext(UserContext);
	const queryEnabled = user !== undefined;

	// TODO: Switch to the other favorites hook
	const {isSuccess, isLoading, isError, data: isFavorite} = useIsFavorite(blueprintKey);

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
			<FavoriteIcon isLoading={isLoading} isError={isError} isFavorite={isFavorite} />
			{' Favorite'}
		</Button>
	);
}

FavoriteButton.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

export default FavoriteButton;
