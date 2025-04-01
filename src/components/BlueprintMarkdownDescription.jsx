import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React from 'react';

const BlueprintMarkdownDescription = ({ renderedMarkdown, isLoading }) =>
{
	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} spin />;
	}

	return <div className='markdown-content' style={{padding: '0.5rem'}} dangerouslySetInnerHTML={{__html: renderedMarkdown}} />;
};

BlueprintMarkdownDescription.propTypes = {
	renderedMarkdown: PropTypes.string,
	isLoading       : PropTypes.bool.isRequired,
};

BlueprintMarkdownDescription.defaultProps = {
	renderedMarkdown: '',
};

export default BlueprintMarkdownDescription;
