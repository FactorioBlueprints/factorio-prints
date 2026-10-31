import {faCheck, faPlusSquare} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import axios from 'axios';
import type {User} from 'firebase/auth';

import {getDatabase, ref, update} from 'firebase/database';

import {useContext} from 'react';
import Button from 'react-bootstrap/Button';

import {app} from '../../base';

import UserContext from '../../context/userContext';
import useIsInCollection from '../../hooks/useIsInCollection';

async function putIsInCollection(blueprintKey: string, isInCollection: boolean, user: User) {
	const url = `${process.env.REACT_APP_REST_URL}/api/my/collection/${blueprintKey}`;
	const idToken = await user.getIdToken();
	const config = {
		headers: {
			Authorization: `Bearer ${idToken}`,
			'content-type': 'application/json',
		},
		params: {
			isInCollection,
		},
	};
	const put = axios.put(url, null, config);

	update(ref(getDatabase(app)), {
		[`/users/${user.uid}/collection/${blueprintKey}`]: isInCollection ? true : null,
	});

	return put;
}

interface CollectionButtonProps {
	blueprintKey: string;
}

function CollectionButton({blueprintKey}: CollectionButtonProps) {
	const queryClient = useQueryClient();
	const {user} = useContext(UserContext);

	const {isSuccess, data: isInCollection} = useIsInCollection(blueprintKey);

	const toggleCollectionMutation = useMutation({
		mutationFn: () => putIsInCollection(blueprintKey, !isInCollection, user as User),
		onSuccess: () => {
			queryClient.invalidateQueries({queryKey: ['api/my/collection/', blueprintKey, user?.uid]});
			queryClient.invalidateQueries({queryKey: ['/api/my/collectionBlueprints/page']});
		},
	});

	return (
		<Button
			size="lg"
			className="ms-2"
			disabled={!isSuccess}
			onClick={() => {
				toggleCollectionMutation.mutate();
			}}
		>
			<FontAwesomeIcon
				icon={isInCollection ? faCheck : faPlusSquare}
				fixedWidth
			/>
			{isInCollection ? ' Remove from collection' : ' Add to collection'}
		</Button>
	);
}

export default CollectionButton;
