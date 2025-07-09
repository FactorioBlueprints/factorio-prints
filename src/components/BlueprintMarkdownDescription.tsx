import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {MarkdownWithRichText} from './core/text/MarkdownWithRichText';

interface BlueprintMarkdownDescriptionProps {
	markdown?: string;
	isLoading: boolean;
}

const BlueprintMarkdownDescription: React.FC<BlueprintMarkdownDescriptionProps> = ({markdown, isLoading}) => {
	if (isLoading) {
		return (
			<FontAwesomeIcon
				icon={faCog}
				spin
			/>
		);
	}

	if (!markdown) {
		return null;
	}

	return (
		<div
			className="markdown-content"
			style={{padding: '0.5rem'}}
		>
			<MarkdownWithRichText markdown={markdown} />
		</div>
	);
};

export default BlueprintMarkdownDescription;
