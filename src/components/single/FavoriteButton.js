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

function postIsFavorite(blueprintKey, isFavorite, idToken)
{
	const headers = getHeaders(idToken);
	return axios.put(`${process.env.REACT_APP_REST_URL}/api/my/favorite/${blueprintKey}?isFavorite=${isFavorite}`, null, headers);
}

function FavoriteButton({blueprintKey})
{
	const queryClient  = useQueryClient();
	const {idToken}    = useContext(UserContext);
	const queryEnabled = idToken !== undefined;
	const queryKey     = [idToken, 'isFavorite', blueprintKey];

	// TODO: Switch to the other favorites hook
	const {isSuccess, isLoading, isError, data} = useIsFavorite(blueprintKey);

	const isFavorite = data && data.data;

	const toggleFavoriteMutation = useMutation(
		() => postIsFavorite(blueprintKey, !isFavorite, idToken),
		{
			enabled  : queryEnabled,
			onSuccess: () =>
			{
				queryClient.invalidateQueries(queryKey);
				queryClient.invalidateQueries([idToken, 'favorites']);
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
			<FavoriteIcon isLoading={isLoading} isError={isError} data={data} />
			{' Favorite'}
		</Button>
	);
}

FavoriteButton.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

export default FavoriteButton;
