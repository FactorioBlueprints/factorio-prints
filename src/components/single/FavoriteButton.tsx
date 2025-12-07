import {useMutation, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';

import {getDatabase, ref, update} from 'firebase/database';
import {useContext} from 'react';
import Button from 'react-bootstrap/Button';

import {app} from '../../base';

import UserContext from '../../context/userContext';
import useIsFavorite from '../../hooks/useIsFavorite';

import FavoriteIcon from './FavoriteIcon';

async function postIsFavorite(blueprintKey: string, isFavorite: boolean, user: any) {
	const url = `${process.env.REACT_APP_REST_URL}/api/my/favorite/${blueprintKey}`;
	const body = null;
	const idToken = user === undefined ? undefined : await user.getIdToken();
	const config = {
		headers: {
			Authorization: `Bearer ${idToken}`,
			'content-type': 'application/json',
		},
		params: {
			isFavorite,
		},
	};
	const put = axios.put(url, body, config);

	const {uid} = user;

	const wasFavorite = !isFavorite;

	console.log('postIsFavorite', {blueprintKey, isFavorite, user, uid, wasFavorite});

	const updates: Record<string, boolean | null> = {
		[`/blueprints/${blueprintKey}/favorites/${uid}`]: wasFavorite ? null : true,
		[`/users/${uid}/favorites/${blueprintKey}`]: wasFavorite ? null : true,
	};

	const database = getDatabase(app);

	update(ref(database), updates);

	return put;
}

interface FavoriteButtonProps {
	blueprintKey: string;
}

function FavoriteButton({blueprintKey}: FavoriteButtonProps) {
	const queryClient = useQueryClient();
	const {user} = useContext(UserContext);
	const queryEnabled = user !== undefined;

	// TODO: Switch to the other favorites hook
	const {isSuccess, data: isFavorite} = useIsFavorite(blueprintKey);

	const toggleFavoriteMutation = useMutation({
		mutationFn: () => postIsFavorite(blueprintKey, !isFavorite, user),
		onSuccess: () => {
			queryClient.invalidateQueries({queryKey: ['api/my/favorites/', (user as any).uid]});
			queryClient.invalidateQueries({queryKey: ['api/my/favorite/', blueprintKey, (user as any).uid]});
			queryClient.invalidateQueries({queryKey: ['/api/my/favoriteBlueprints/page', (user as any).email]});
			queryClient.invalidateQueries({queryKey: ['blueprintDetails', blueprintKey]});
		},
	});

	const buttonEnabled = queryEnabled && isSuccess;

	return (
		<Button
			size="lg"
			disabled={!buttonEnabled}
			onClick={() => {
				toggleFavoriteMutation.mutate();
			}}
		>
			<FavoriteIcon isFavorite={isFavorite} />
			{' Favorite'}
		</Button>
	);
}

export default FavoriteButton;
