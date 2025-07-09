import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {MarkdownWithRichText} from './core/text/MarkdownWithRichText';

interface BlueprintMarkdownDescriptionProps {
	renderedMarkdown?: string;
	rawMarkdown?: string;
	isLoading: boolean;
}

const BlueprintMarkdownDescription: React.FC<BlueprintMarkdownDescriptionProps> = ({
	renderedMarkdown = '',
	rawMarkdown,
	isLoading,
}) => {
	if (isLoading) {
		return (
			<FontAwesomeIcon
				icon={faCog}
				spin
			/>
		);
	}

	// If we have raw markdown, use MarkdownWithRichText to support rich text within markdown
	if (rawMarkdown) {
		return (
			<div
				className="markdown-content"
				style={{padding: '0.5rem'}}
			>
				<MarkdownWithRichText markdown={rawMarkdown} />
			</div>
		);
	}

	// Fallback to pre-rendered HTML if no raw markdown available
	return (
		<div
			className="markdown-content"
			style={{padding: '0.5rem'}}
			dangerouslySetInnerHTML={{__html: renderedMarkdown}}
		/>
	);
};

export default BlueprintMarkdownDescription;
