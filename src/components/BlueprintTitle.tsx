import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';

interface BlueprintTitleProps {
	title?: string;
	isLoading: boolean;
}

const BlueprintTitle: React.FC<BlueprintTitleProps> = ({ title, isLoading }) =>
{
	if (isLoading)
	{
		return <h1><FontAwesomeIcon icon={faCog} spin /></h1>;
	}

	return <h1>{title}</h1>;
};

export default React.memo(BlueprintTitle);
