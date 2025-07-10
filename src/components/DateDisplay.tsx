import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import moment from 'moment';
import React from 'react';

interface DateDisplayProps {
	date?: number;
	isLoading: boolean;
}

const DateDisplay: React.FC<DateDisplayProps> = ({date, isLoading}) => {
	if (isLoading) {
		return (
			<FontAwesomeIcon
				icon={faCog}
				spin
			/>
		);
	}

	return <span title={moment(date).format('dddd, MMMM Do YYYY, h:mm:ss a')}>{moment(date).fromNow()}</span>;
};

export default React.memo(DateDisplay);
