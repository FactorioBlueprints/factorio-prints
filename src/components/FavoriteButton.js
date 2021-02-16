import axios               from 'axios';
import PropTypes           from 'prop-types';
import React, {useContext} from 'react';
import Button              from 'react-bootstrap/Button';

import {useMutation, useQuery, useQueryClient} from 'react-query';

import UserContext  from '../context/userContext';
import FavoriteIcon from './FavoriteIcon';

function getHeaders(idToken)
{
	return {
		headers: {
			Authorization: `Bearer ${idToken}`,
		},
	};
}

function getIsFavorite(blueprintKey, idToken)
{
	const headers = getHeaders(idToken);
	return axios.get(`${process.env.REACT_APP_REST_URL}/api/my/favorite/${blueprintKey}`, headers);
}

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

	const {isSuccess, isLoading, isError, data} = useQuery(
		queryKey,
		() => getIsFavorite(blueprintKey, idToken),
		{
			enabled: queryEnabled,
		},
	);

	const isFavorite = data && data.data;

	const toggleFavoriteMutation = useMutation(
		() => postIsFavorite(blueprintKey, !isFavorite, idToken),
		{
			enabled  : queryEnabled,
			onSuccess: () =>
			{
				queryClient.invalidateQueries(queryKey);
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

FavoriteButton.propTypes = {
	blueprintKey: PropTypes.string.isRequired,
};

export default FavoriteButton;
