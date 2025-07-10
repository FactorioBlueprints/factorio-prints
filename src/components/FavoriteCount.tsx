import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';

interface FavoriteCountProps {
	count?: number;
	isLoading: boolean;
}

const FavoriteCount: React.FC<FavoriteCountProps> = ({count, isLoading}) => {
	if (isLoading) {
		return (
			<FontAwesomeIcon
				icon={faCog}
				spin
			/>
		);
	}

	return <>{count}</>;
};

export default React.memo(FavoriteCount);
