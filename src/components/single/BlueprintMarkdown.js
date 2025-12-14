import {forbidExtraProps}    from 'airbnb-prop-types';
import PropTypes             from 'prop-types';
import React                 from 'react';
import useBlueprint          from '../../hooks/useBlueprint';
import MarkdownWithRichText  from '../core/MarkdownWithRichText';

BlueprintMarkdown.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function BlueprintMarkdown({blueprintKey})
{
	const result                = useBlueprint(blueprintKey);
	const {descriptionMarkdown} = result.data.data;

	return <MarkdownWithRichText markdown={descriptionMarkdown} />;
}

export default BlueprintMarkdown;
