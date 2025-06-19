import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';

interface BlueprintMarkdownDescriptionProps {
	renderedMarkdown?: string;
	isLoading: boolean;
}

const BlueprintMarkdownDescription: React.FC<BlueprintMarkdownDescriptionProps> = ({ renderedMarkdown = '', isLoading }) =>
{
	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} spin />;
	}

	return <div className='markdown-content' style={{padding: '0.5rem'}} dangerouslySetInnerHTML={{__html: renderedMarkdown}} />;
};

export default BlueprintMarkdownDescription;
